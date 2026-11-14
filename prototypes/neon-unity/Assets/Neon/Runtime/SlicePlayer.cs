// VERTICAL SLICE — Neon Survivor, Unity-only experiment; not a production port.
// Validation question: can a first-time player understand and complete one polished three-minute run?
// Date: 2026-11-14
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using Oiyo.Neon;

public sealed class SlicePlayer : MonoBehaviour
{
    const string SaveKey = "oiyo.neon.slice.v1";
    static readonly Color Ink = new Color32(7, 17, 31, 255);
    static readonly Color Panel = new Color32(23, 42, 61, 242);
    static readonly Color Ivory = new Color32(234, 245, 242, 255);
    static readonly Color Cyan = new Color32(76, 239, 218, 255);
    static readonly Color Amber = new Color32(255, 195, 107, 255);
    static readonly Color Coral = new Color32(255, 104, 127, 255);
    static readonly Color Violet = new Color32(180, 147, 255, 255);

    Run run = new Run(20261113);
    static uint nextRunSeed = 20261113;
    readonly List<Transform> enemies = new List<Transform>();
    readonly List<SpriteRenderer> enemyRenderers = new List<SpriteRenderer>();
    readonly List<Transform> gems = new List<Transform>();
    readonly List<Transform> hostileShots = new List<Transform>();
    Transform ship, engineGlow, dashRing, background;
    Transform extractionMarker, safeLane;
    Transform bossTellRing;
    SpriteRenderer beam;
    Sprite shipSprite, droneSprite, skitterSprite, bastionSprite, wardenSprite, gemSprite, coreSprite;
    Sprite circleSprite, panelSprite, titleKeyArtSprite, starOrbitBgSprite;
    Sprite fxShotNeedleSprite, fxHostileBeadSprite, fxDashRingSprite, fxWarningRingSprite, fxSafeLaneSprite, fxExtractionGateSprite;
    Sprite frameSilverSprite, frameGoldSprite, framePrismaticSprite;
    Camera view;
    Canvas canvas;
    RectTransform safeRoot;
    Text timerText, healthText, levelText, killsText, bossText, warningText, objectiveText, menuTitleText, menuSubtitleText, controlsText, resultTitleText, resultStatsText, bestText;
    Image healthFill, bossFill, beamImage, xpFill, titleArtImage, resultArtImage;
    GameObject titleScreen, hudScreen, pauseScreen, upgradeScreen, resultScreen;
    readonly Button[] upgradeButtons = new Button[3];
    readonly Text[] upgradeTitles = new Text[3];
    Button dashButton, pauseButton, launchButton, continueButton, playAgainButton;
    Text dashLabel;
    StickControl stickControl;
    Font fontKo, fontJa, fontZh;
    AudioSource sfxSource, musicSource;
    AudioClip uiClickClip, shotClip, armorHitClip, pickupClip, killClip, hitClip, dashClip, upgradeClip, bossWarnClip, bossVolleyClip, bossDownClip, winClip, loseClip, musicClip;
    ParticleSystem burst;
    Vector2 stick;
    float accumulator, hitStop, shake, beamLifetime, hudRefresh;
    int pointer = -1, seenKills, seenShots, seenPickups, seenPhase = -1, seenBossAttack, seenDash;
    bool seenBossWarning, seenBossDown;
    bool dashQueued, sfxOn = true, musicOn = true, reducedMotion;
    int language;

    void Awake()
    {
        Application.targetFrameRate = 60;
        Application.runInBackground = false;
        Screen.orientation = ScreenOrientation.Portrait;
        ReadPreferences();
        LoadFonts();
        BuildArt();
        BuildAudio();
        BuildWorld();
        BuildUI();
        ShowPhase(true);
    }

    void ReadPreferences()
    {
        sfxOn = PlayerPrefs.GetInt(SaveKey + ".sfx", 1) == 1;
        musicOn = PlayerPrefs.GetInt(SaveKey + ".music", 1) == 1;
        reducedMotion = PlayerPrefs.GetInt(SaveKey + ".motion", 0) == 1;
        language = Mathf.Clamp(PlayerPrefs.GetInt(SaveKey + ".language", 0), 0, 5);
    }

    void LoadFonts()
    {
        fontKo = Resources.Load<Font>("Fonts/NeonKR-Regular");
        fontJa = Resources.Load<Font>("Fonts/NeonJP-Regular");
        fontZh = Resources.Load<Font>("Fonts/NeonSC-Regular");
        if (!fontKo || !fontJa || !fontZh) throw new InvalidOperationException("A bundled locale font is missing.");
    }

    Font LocaleFont() => language == 2 ? fontJa : language == 3 ? fontZh : fontKo;

    Sprite LoadBundledSprite(string path, float pixelsPerUnit, Vector4 border = default)
    {
        var tex = Resources.Load<Texture2D>(path);
        if (!tex) return null;
        tex.filterMode = FilterMode.Bilinear;
        return Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), new Vector2(.5f, .5f), pixelsPerUnit, 0, SpriteMeshType.FullRect, border);
    }

    static Sprite SliceAtlasCell(Texture2D atlas, int col, int rowFromTop, float pixelsPerUnit)
    {
        if (!atlas) return null;
        int cellW = atlas.width / 4, cellH = atlas.height / 2;
        int y = rowFromTop == 0 ? cellH : 0;
        return Sprite.Create(atlas, new Rect(col * cellW, y, cellW, cellH), new Vector2(.5f, .5f), pixelsPerUnit, 0, SpriteMeshType.FullRect);
    }

    void BuildArt()
    {
        circleSprite = CircleSprite("Glow");
        panelSprite = RoundedSprite("Panel");

        shipSprite = LoadBundledSprite("Textures/PlayerProbe", 512f)
            ?? PolygonSprite("Pilot", new Vector2[] { new Vector2(0, .58f), new Vector2(.22f, .08f), new Vector2(.48f, -.3f), new Vector2(.14f, -.2f), new Vector2(0, -.4f), new Vector2(-.14f, -.2f), new Vector2(-.48f, -.3f), new Vector2(-.22f, .08f) });
        droneSprite = LoadBundledSprite("Textures/EnemyDrone", 512f)
            ?? PolygonSprite("Drone", new Vector2[] { new Vector2(0, .48f), new Vector2(.46f, .1f), new Vector2(.28f, -.42f), new Vector2(0, -.27f), new Vector2(-.28f, -.42f), new Vector2(-.46f, .1f) });
        skitterSprite = LoadBundledSprite("Textures/EnemySkitter", 512f)
            ?? PolygonSprite("Skitter", new Vector2[] { new Vector2(0, .5f), new Vector2(.2f, .08f), new Vector2(.48f, -.18f), new Vector2(.1f, -.08f), new Vector2(-.32f, -.5f), new Vector2(-.16f, -.04f), new Vector2(-.45f, .2f) });
        bastionSprite = LoadBundledSprite("Textures/EnemyBastion", 512f)
            ?? PolygonSprite("Bastion", new Vector2[] { new Vector2(-.42f, .3f), new Vector2(-.16f, .48f), new Vector2(.22f, .4f), new Vector2(.45f, .14f), new Vector2(.35f, -.38f), new Vector2(-.1f, -.48f), new Vector2(-.42f, -.2f) });
        wardenSprite = LoadBundledSprite("Textures/EnemyWarden", 1024f)
            ?? PolygonSprite("Warden", new Vector2[] { new Vector2(0, .6f), new Vector2(.25f, .4f), new Vector2(.54f, .35f), new Vector2(.36f, .08f), new Vector2(.52f, -.2f), new Vector2(.2f, -.16f), new Vector2(0, -.58f), new Vector2(-.2f, -.16f), new Vector2(-.52f, -.2f), new Vector2(-.36f, .08f), new Vector2(-.54f, .35f), new Vector2(-.25f, .4f) });
        gemSprite = LoadBundledSprite("Textures/SalvageShard", 256f)
            ?? PolygonSprite("Shard", new Vector2[] { new Vector2(0, .5f), new Vector2(.32f, .12f), new Vector2(.2f, -.35f), new Vector2(0, -.5f), new Vector2(-.2f, -.35f), new Vector2(-.32f, .12f) });
        coreSprite = LoadBundledSprite("Textures/WardenCore", 256f) ?? gemSprite;
        titleKeyArtSprite = LoadBundledSprite("Textures/TitleKeyArt", 100f);
        starOrbitBgSprite = LoadBundledSprite("Textures/StarOrbitBg", 18f) ?? BackgroundSprite();

        var fxAtlas = Resources.Load<Texture2D>("Textures/CombatFxAtlas");
        if (fxAtlas) fxAtlas.filterMode = FilterMode.Bilinear;
        fxShotNeedleSprite = SliceAtlasCell(fxAtlas, 0, 0, 512f) ?? circleSprite;
        fxHostileBeadSprite = SliceAtlasCell(fxAtlas, 1, 0, 512f) ?? circleSprite;
        fxDashRingSprite = SliceAtlasCell(fxAtlas, 2, 0, 512f) ?? circleSprite;
        fxWarningRingSprite = SliceAtlasCell(fxAtlas, 0, 1, 512f) ?? circleSprite;
        fxSafeLaneSprite = SliceAtlasCell(fxAtlas, 1, 1, 512f) ?? circleSprite;
        fxExtractionGateSprite = SliceAtlasCell(fxAtlas, 2, 1, 512f) ?? circleSprite;

        var sliceBorder = new Vector4(28, 28, 28, 28);
        frameSilverSprite = LoadBundledSprite("Textures/ChoiceFrameSilver", 100f, sliceBorder) ?? panelSprite;
        frameGoldSprite = LoadBundledSprite("Textures/ChoiceFrameGold", 100f, sliceBorder) ?? panelSprite;
        framePrismaticSprite = LoadBundledSprite("Textures/ChoiceFramePrismatic", 100f, sliceBorder) ?? panelSprite;
    }

    void BuildWorld()
    {
        var cameraObject = new GameObject("Neon Camera");
        view = cameraObject.AddComponent<Camera>();
        cameraObject.AddComponent<AudioListener>();
        view.orthographic = true;
        view.orthographicSize = 22;
        view.transform.position = new Vector3(0, 0, -10);
        view.backgroundColor = Ink;
        view.clearFlags = CameraClearFlags.SolidColor;
        background = Make("Orbital field", starOrbitBgSprite, Color.white, 1);
        background.localScale = Vector3.one;
        background.position = Vector3.forward;
        CreateStars(140);
        ship = Make("Pilot", shipSprite, Color.white, 1.05f);
        MakePart(ship, "Ion reactor", circleSprite, Cyan, .2f, Vector2.zero, 2);
        engineGlow = Make("Ion wake", circleSprite, new Color32(76, 239, 218, 175), .35f);
        dashRing = Make("Dash wake", fxDashRingSprite, new Color(Cyan.r, Cyan.g, Cyan.b, .72f), .9f);
        dashRing.gameObject.SetActive(false);
        extractionMarker = Make("Extraction beacon", fxExtractionGateSprite, Color.white, 2.8f);
        extractionMarker.position = new Vector3(0, 17, 0);
        extractionMarker.gameObject.SetActive(false);
        bossTellRing = Make("Warden attack tell", fxWarningRingSprite, new Color(1, 1, 1, .85f), 3.2f);
        bossTellRing.gameObject.SetActive(false);
        safeLane = Make("Safe volley lane", fxSafeLaneSprite, new Color(1, 1, 1, .82f), 1);
        safeLane.gameObject.SetActive(false);
        beam = Make("Pulse tracer", fxShotNeedleSprite, Color.white, 1).GetComponent<SpriteRenderer>();
        beam.gameObject.SetActive(false);
        var particleObject = new GameObject("Impact sparks");
        burst = particleObject.AddComponent<ParticleSystem>();
        burst.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
        var main = burst.main;
        main.loop = false; main.playOnAwake = false; main.duration = .35f;
        main.startLifetime = new ParticleSystem.MinMaxCurve(.18f, .55f);
        main.startSpeed = new ParticleSystem.MinMaxCurve(2, 7);
        main.startSize = new ParticleSystem.MinMaxCurve(.04f, .11f);
        main.startColor = Amber; main.maxParticles = 96;
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        var emission = burst.emission; emission.enabled = false;
        var shape = burst.shape; shape.shapeType = ParticleSystemShapeType.Circle; shape.radius = .18f;
        var renderer = burst.GetComponent<ParticleSystemRenderer>(); renderer.renderMode = ParticleSystemRenderMode.Billboard;
        seenKills = 0; seenShots = 0;
    }

    void CreateStars(int count)
    {
        uint seed = 981723;
        for (int i = 0; i < count; i++)
        {
            seed = seed * 1664525 + 1013904223; float x = ((seed >> 8) / 16777216f - .5f) * 60;
            seed = seed * 1664525 + 1013904223; float y = ((seed >> 8) / 16777216f - .5f) * 80;
            seed = seed * 1664525 + 1013904223; float size = .025f + ((seed >> 8) / 16777216f) * .055f;
            var star = Make("Star", circleSprite, i % 9 == 0 ? new Color(.24f, .8f, .82f, .55f) : new Color(.5f, .68f, .82f, .38f), size);
            star.position = new Vector3(x, y, 1.5f);
        }
    }

    void BuildAudio()
    {
        sfxSource = gameObject.AddComponent<AudioSource>(); sfxSource.loop = false; sfxSource.playOnAwake = false; sfxSource.volume = .52f;
        musicSource = gameObject.AddComponent<AudioSource>(); musicSource.loop = true; musicSource.playOnAwake = false; musicSource.volume = .13f;
        // WHY (2026-11-14): PRD §9 & game-audio-design require 12 distinct event cues with multi-layer harmonic envelopes.
        uiClickClip = LayeredCue("ui-click", 880, 1320, .04f, 38f, .02f, .14f);
        shotClip = LayeredCue("shot-pulse", 680, 420, .055f, 32f, .04f, .15f);
        armorHitClip = LayeredCue("armor-clang", 240, 720, .07f, 24f, .08f, .18f);
        pickupClip = LayeredCue("shard-pickup", 920, 1380, .08f, 22f, .01f, .14f);
        dashClip = LayeredCue("ion-dash", 310, 620, .14f, 14f, .12f, .2f);
        killClip = LayeredCue("enemy-break", 290, 870, .14f, 16f, .15f, .18f);
        hitClip = LayeredCue("hull-hit", 135, 92, .16f, 12f, .22f, .24f);
        upgradeClip = Arpeggio("level-choice", new float[] { 523.25f, 659.25f, 783.99f }, .28f, .16f);
        bossWarnClip = LayeredCue("warden-warning", 220, 330, .48f, 4.5f, .06f, .22f);
        bossVolleyClip = LayeredCue("warden-volley", 195, 585, .22f, 10f, .14f, .2f);
        bossDownClip = Arpeggio("warden-defeated", new float[] { 392f, 523.25f, 659.25f, 783.99f }, .52f, .2f);
        winClip = Arpeggio("extraction-win", new float[] { 440f, 554.37f, 659.25f, 880f }, .62f, .2f);
        loseClip = Arpeggio("signal-lost", new float[] { 311.13f, 277.18f, 220f, 164.81f }, .58f, .2f);
        musicClip = Drone("orbit-bgm", 73.42f, 12f);
        musicSource.clip = musicClip;
    }

    AudioClip LayeredCue(string label, float f0, float f1, float seconds, float decay, float noiseMix, float gain)
    {
        const int rate = 22050; int count = Mathf.RoundToInt(rate * seconds); var data = new float[count];
        uint seed = (uint)label.GetHashCode() ^ 0x9E3779B9u;
        float phaseA = 0, phaseB = 0;
        for (int i = 0; i < count; i++)
        {
            float t = i / (float)rate, u = i / (float)count;
            float hz = Mathf.Lerp(f0, f1, u);
            phaseA += 2 * Mathf.PI * hz / rate;
            phaseB += 2 * Mathf.PI * (hz * 1.498f) / rate;
            seed = seed * 1664525 + 1013904223;
            float noise = ((seed >> 8) / 8388608f - 1f) * noiseMix * Mathf.Exp(-t * decay * 1.8f);
            float attack = Mathf.Clamp01(t * 240f);
            float env = attack * Mathf.Exp(-t * decay);
            data[i] = Mathf.Clamp((.68f * Mathf.Sin(phaseA) + .32f * Mathf.Sin(phaseB) + noise) * env * gain, -.9f, .9f);
        }
        var clip = AudioClip.Create(label, count, 1, rate, false); clip.SetData(data, 0); return clip;
    }

    AudioClip Arpeggio(string label, float[] notes, float seconds, float gain)
    {
        const int rate = 22050; int count = Mathf.RoundToInt(rate * seconds); var data = new float[count];
        for (int i = 0; i < count; i++)
        {
            float t = i / (float)rate, u = Mathf.Clamp01(i / (float)count);
            int idx = Mathf.Min(notes.Length - 1, Mathf.FloorToInt(u * notes.Length));
            float localT = (u * notes.Length - idx) * (seconds / notes.Length);
            float hz = notes[idx];
            float env = Mathf.Clamp01(localT * 180f) * Mathf.Exp(-localT * 7.5f);
            data[i] = (Mathf.Sin(2 * Mathf.PI * hz * t) + .42f * Mathf.Sin(2 * Mathf.PI * hz * 1.5f * t)) * env * gain;
        }
        var clip = AudioClip.Create(label, count, 1, rate, false); clip.SetData(data, 0); return clip;
    }

    AudioClip Drone(string label, float hz, float seconds)
    {
        const int rate = 22050; int count = Mathf.RoundToInt(rate * seconds); var data = new float[count];
        for (int i = 0; i < count; i++)
        {
            float t = i / (float)rate, swell = .65f + .35f * Mathf.Sin(t * Mathf.PI * 2 / seconds);
            float sub = .55f * Mathf.Sin(2 * Mathf.PI * hz * t);
            float fifth = .25f * Mathf.Sin(2 * Mathf.PI * hz * 1.5f * t);
            float shimmer = .12f * Mathf.Sin(2 * Mathf.PI * hz * 2f * t + Mathf.Sin(t * 1.5f));
            data[i] = swell * (sub + fifth + shimmer) * .09f;
        }
        var clip = AudioClip.Create(label, count, 1, rate, false); clip.SetData(data, 0); return clip;
    }

    void BuildUI()
    {
        if (FindFirstObjectByType<EventSystem>() == null)
        {
            var es = new GameObject("Event System");
            es.AddComponent<EventSystem>();
            es.AddComponent<StandaloneInputModule>();
        }
        var canvasObject = new GameObject("Neon Interface", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
        canvas = canvasObject.GetComponent<Canvas>(); canvas.renderMode = RenderMode.ScreenSpaceOverlay; canvas.sortingOrder = 20;
        var scaler = canvasObject.GetComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080, 1920);
        scaler.matchWidthOrHeight = 1f;
        var root = PanelObject("Safe Interface", canvasObject.transform, Color.clear, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
        safeRoot = root.GetComponent<RectTransform>();
        ApplySafeArea();
        titleScreen = NewScreen("Title", safeRoot); hudScreen = NewScreen("HUD", safeRoot); pauseScreen = NewScreen("Pause", safeRoot); upgradeScreen = NewScreen("Build Choice", safeRoot); resultScreen = NewScreen("Run Report", safeRoot);
        BuildTitle(); BuildHud(); BuildPause(); BuildUpgrades(); BuildResults();
        stickControl = MakeStick(hudScreen.transform);
        hudScreen.SetActive(false); pauseScreen.SetActive(false); upgradeScreen.SetActive(false); resultScreen.SetActive(false);
    }

    void BuildTitle()
    {
        if (titleKeyArtSprite != null)
        {
            var backdrop = PanelObject("Title KeyArt", titleScreen.transform, new Color(1, 1, 1, .88f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            titleArtImage = backdrop.GetComponent<Image>(); titleArtImage.sprite = titleKeyArtSprite; titleArtImage.type = Image.Type.Simple; titleArtImage.preserveAspect = false;
        }
        var card = PanelObject("Title card", titleScreen.transform, new Color(Panel.r, Panel.g, Panel.b, .88f), new Vector2(.08f, .22f), new Vector2(.92f, .82f), Vector2.zero, Vector2.zero);
        menuTitleText = TextObject("Title", card.transform, "NEON\nSURVIVOR", 76, Ivory, TextAnchor.MiddleCenter, new Vector2(.08f, .58f), new Vector2(.92f, .9f)); menuTitleText.fontStyle = FontStyle.Bold;
        menuSubtitleText = TextObject("Subtitle", card.transform, "", 25, Cyan, TextAnchor.MiddleCenter, new Vector2(.08f, .47f), new Vector2(.92f, .59f));
        controlsText = TextObject("Controls", card.transform, "", 23, new Color32(185, 203, 220, 255), TextAnchor.MiddleCenter, new Vector2(.08f, .26f), new Vector2(.92f, .46f));
        launchButton = MakeButton("Launch", card.transform, "", new Vector2(.12f, .1f), new Vector2(.88f, .23f), Cyan, () => { Play(uiClickClip); ResetRun(); run.Start(); UpdateMusic(0); Play(dashClip); ShowPhase(true); });
        launchButton.GetComponentInChildren<Text>().color = Ink;
        var settings = MakeButton("Language", titleScreen.transform, "", new Vector2(.62f, .91f), new Vector2(.94f, .98f), Panel, () => { Play(uiClickClip); CycleLanguage(); });
        SetButtonCaption(settings, "EN · SETTINGS");
    }

    void BuildHud()
    {
        var top = PanelObject("Run status", hudScreen.transform, new Color(Panel.r, Panel.g, Panel.b, .92f), new Vector2(.05f, .87f), new Vector2(.95f, .98f), Vector2.zero, Vector2.zero);
        timerText = TextObject("Countdown", top.transform, "03:00", 44, Ivory, TextAnchor.MiddleLeft, new Vector2(.04f, .47f), new Vector2(.38f, .96f)); timerText.fontStyle = FontStyle.Bold;
        levelText = TextObject("Level", top.transform, "LV 01", 25, Cyan, TextAnchor.MiddleRight, new Vector2(.54f, .55f), new Vector2(.82f, .95f));
        healthText = TextObject("Hull", top.transform, "HULL", 19, new Color32(190, 207, 222, 255), TextAnchor.MiddleLeft, new Vector2(.04f, .08f), new Vector2(.32f, .48f));
        var hbg = PanelObject("Hull track", top.transform, new Color32(46, 60, 77, 255), new Vector2(.33f, .2f), new Vector2(.82f, .39f), Vector2.zero, Vector2.zero);
        healthFill = PanelObject("Hull", hbg.transform, Cyan, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero).GetComponent<Image>(); healthFill.type = Image.Type.Filled; healthFill.fillMethod = Image.FillMethod.Horizontal; healthFill.fillOrigin = (int)Image.OriginHorizontal.Left;
        var xpbg = PanelObject("XP track", hudScreen.transform, new Color32(35, 48, 65, 255), new Vector2(.08f, .845f), new Vector2(.92f, .856f), Vector2.zero, Vector2.zero);
        xpFill = PanelObject("XP progress", xpbg.transform, Amber, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero).GetComponent<Image>(); xpFill.type = Image.Type.Filled; xpFill.fillMethod = Image.FillMethod.Horizontal; xpFill.fillOrigin = (int)Image.OriginHorizontal.Left;
        killsText = TextObject("Run stats", hudScreen.transform, "", 22, Amber, TextAnchor.MiddleCenter, new Vector2(.16f, .805f), new Vector2(.84f, .842f));
        var boss = PanelObject("Warden health panel", hudScreen.transform, Panel, new Vector2(.14f, .745f), new Vector2(.86f, .798f), Vector2.zero, Vector2.zero); boss.SetActive(false);
        bossText = TextObject("Warden", boss.transform, "WARDEN", 18, Coral, TextAnchor.MiddleCenter, new Vector2(.04f, .5f), new Vector2(.96f, .96f));
        var bbg = PanelObject("Warden track", boss.transform, new Color32(46, 60, 77, 255), new Vector2(.05f, .14f), new Vector2(.95f, .44f), Vector2.zero, Vector2.zero);
        bossFill = PanelObject("Warden", bbg.transform, Coral, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero).GetComponent<Image>(); bossFill.type = Image.Type.Filled; bossFill.fillMethod = Image.FillMethod.Horizontal;
        warningText = TextObject("Threat warning", hudScreen.transform, "", 24, Coral, TextAnchor.MiddleCenter, new Vector2(.08f, .705f), new Vector2(.92f, .745f));
        objectiveText = TextObject("Extraction objective", hudScreen.transform, "", 22, Amber, TextAnchor.MiddleCenter, new Vector2(.08f, .668f), new Vector2(.92f, .705f));
        pauseButton = MakeButton("Pause", hudScreen.transform, "Ⅱ", new Vector2(.81f, .882f), new Vector2(.94f, .968f), Panel, () => { Play(uiClickClip); run.Pause(); ClearInput(); ShowPhase(true); });
        dashButton = MakeButton("Dash", hudScreen.transform, "", new Vector2(.72f, .11f), new Vector2(.95f, .24f), new Color32(28, 68, 78, 245), () => dashQueued = true);
        dashLabel = dashButton.GetComponentInChildren<Text>();
    }

    void BuildPause()
    {
        var veil = PanelObject("Pause veil", pauseScreen.transform, new Color(0, 0, 0, .72f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
        var card = PanelObject("Pause card", veil.transform, Panel, new Vector2(.08f, .2f), new Vector2(.92f, .8f), Vector2.zero, Vector2.zero);
        TextObject("Pause title", card.transform, "PAUSED", 48, Ivory, TextAnchor.MiddleCenter, new Vector2(.08f, .82f), new Vector2(.92f, .96f));
        continueButton = MakeButton("Continue", card.transform, "", new Vector2(.1f, .66f), new Vector2(.9f, .78f), Cyan, () => { Play(uiClickClip); ClearInput(); run.Resume(); ShowPhase(true); });
        continueButton.GetComponentInChildren<Text>().color = Ink;
        MakeButton("Retry", card.transform, "", new Vector2(.1f, .51f), new Vector2(.9f, .63f), new Color32(31, 55, 79, 255), () => { Play(uiClickClip); ResetRun(); run.Start(); ShowPhase(true); });
        MakeButton("Sound", card.transform, "", new Vector2(.1f, .36f), new Vector2(.9f, .47f), new Color32(23, 42, 61, 255), () => { ToggleSfx(); Play(uiClickClip); });
        MakeButton("Music", card.transform, "", new Vector2(.1f, .21f), new Vector2(.9f, .32f), new Color32(23, 42, 61, 255), () => { Play(uiClickClip); ToggleMusic(); });
        MakeButton("Motion", card.transform, "", new Vector2(.1f, .06f), new Vector2(.9f, .17f), new Color32(23, 42, 61, 255), () => { Play(uiClickClip); ToggleMotion(); });
    }

    void BuildUpgrades()
    {
        var veil = PanelObject("Choice veil", upgradeScreen.transform, new Color(0, 0, 0, .74f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
        var card = PanelObject("Choice panel", veil.transform, Panel, new Vector2(.06f, .15f), new Vector2(.94f, .85f), Vector2.zero, Vector2.zero);
        TextObject("Choice eyebrow", card.transform, "FIELD ADAPTATION", 20, Amber, TextAnchor.MiddleCenter, new Vector2(.08f, .85f), new Vector2(.92f, .93f));
        TextObject("Choice heading", card.transform, "CHOOSE YOUR\nNEXT VECTOR", 44, Ivory, TextAnchor.MiddleCenter, new Vector2(.08f, .71f), new Vector2(.92f, .85f));
        for (int i = 0; i < 3; i++)
        {
            int slot = i;
            var btn = MakeButton("Upgrade " + i, card.transform, "", new Vector2(.08f, .48f - i * .18f), new Vector2(.92f, .63f - i * .18f), Color.white, () => ChooseUpgrade(slot));
            upgradeButtons[i] = btn; upgradeTitles[i] = btn.GetComponentInChildren<Text>();
        }
        TextObject("Choice footer", card.transform, "ONE CHOICE. A NEW SURVIVAL PLAN.", 17, new Color32(150, 176, 196, 255), TextAnchor.MiddleCenter, new Vector2(.05f, .04f), new Vector2(.95f, .11f));
    }

    void BuildResults()
    {
        var veil = PanelObject("Report veil", resultScreen.transform, new Color(0, 0, 0, .78f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
        if (titleKeyArtSprite != null)
        {
            var backdrop = PanelObject("Report KeyArt", veil.transform, new Color(1, 1, 1, .35f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            resultArtImage = backdrop.GetComponent<Image>(); resultArtImage.sprite = titleKeyArtSprite; resultArtImage.type = Image.Type.Simple;
        }
        var card = PanelObject("Report card", veil.transform, Panel, new Vector2(.07f, .18f), new Vector2(.93f, .82f), Vector2.zero, Vector2.zero);
        resultTitleText = TextObject("Report title", card.transform, "", 52, Ivory, TextAnchor.MiddleCenter, new Vector2(.08f, .74f), new Vector2(.92f, .92f)); resultTitleText.fontStyle = FontStyle.Bold;
        resultStatsText = TextObject("Report stats", card.transform, "", 23, Cyan, TextAnchor.MiddleCenter, new Vector2(.06f, .4f), new Vector2(.94f, .72f));
        bestText = TextObject("Best record", card.transform, "", 19, new Color32(180, 200, 218, 255), TextAnchor.MiddleCenter, new Vector2(.08f, .28f), new Vector2(.92f, .39f));
        playAgainButton = MakeButton("Play again", card.transform, "", new Vector2(.1f, .1f), new Vector2(.9f, .24f), Cyan, () => { Play(uiClickClip); ResetRun(); run.Start(); UpdateMusic(0); ShowPhase(true); });
        playAgainButton.GetComponentInChildren<Text>().color = Ink;
    }

    GameObject NewScreen(string name, Transform parent) { var obj = new GameObject(name, typeof(RectTransform)); obj.transform.SetParent(parent, false); Stretch(obj.GetComponent<RectTransform>()); return obj; }
    GameObject PanelObject(string name, Transform parent, Color color, Vector2 min, Vector2 max, Vector2 offsetMin, Vector2 offsetMax)
    {
        var obj = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Image)); obj.transform.SetParent(parent, false);
        var rt = obj.GetComponent<RectTransform>(); rt.anchorMin = min; rt.anchorMax = max; rt.offsetMin = offsetMin; rt.offsetMax = offsetMax;
        var image = obj.GetComponent<Image>(); image.sprite = panelSprite; image.type = Image.Type.Sliced; image.color = color; image.raycastTarget = false; return obj;
    }
    Text TextObject(string name, Transform parent, string value, int size, Color color, TextAnchor align, Vector2 min, Vector2 max)
    {
        var obj = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Text)); obj.transform.SetParent(parent, false);
        var rt = obj.GetComponent<RectTransform>(); rt.anchorMin = min; rt.anchorMax = max; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
        var text = obj.GetComponent<Text>(); text.font = LocaleFont(); text.text = value; text.fontSize = size; text.color = color; text.alignment = align;
        text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Truncate; text.raycastTarget = false;
        text.resizeTextForBestFit = true; text.resizeTextMinSize = Mathf.Max(13, size / 2); text.resizeTextMaxSize = size; text.supportRichText = false; return text;
    }
    Button MakeButton(string name, Transform parent, string label, Vector2 min, Vector2 max, Color color, UnityEngine.Events.UnityAction action)
    {
        var obj = PanelObject(name, parent, color, min, max, Vector2.zero, Vector2.zero); var image = obj.GetComponent<Image>(); image.raycastTarget = true;
        var button = obj.AddComponent<Button>(); button.targetGraphic = image; button.transition = Selectable.Transition.ColorTint;
        button.colors = new ColorBlock { normalColor = Color.white, highlightedColor = new Color(1, 1, 1, 1), pressedColor = new Color(.72f, .86f, .9f, 1), selectedColor = new Color(.88f, 1f, .98f, 1), disabledColor = new Color(.4f, .45f, .5f, .7f), colorMultiplier = 1, fadeDuration = .08f };
        button.onClick.AddListener(action);
        TextObject("Label", obj.transform, label, 26, Ivory, TextAnchor.MiddleCenter, new Vector2(.06f, .08f), new Vector2(.94f, .92f)); return button;
    }
    StickControl MakeStick(Transform parent)
    {
        var obj = PanelObject("Move control", parent, new Color(.18f, .82f, .82f, .17f), new Vector2(.06f, .09f), new Vector2(.38f, .26f), Vector2.zero, Vector2.zero); obj.GetComponent<Image>().raycastTarget = true;
        var ctl = obj.AddComponent<StickControl>(); ctl.Owner = this;
        var ring = PanelObject("Thumb", obj.transform, new Color(.47f, .96f, .89f, .62f), new Vector2(.24f, .24f), new Vector2(.76f, .76f), Vector2.zero, Vector2.zero); ring.GetComponent<Image>().raycastTarget = false;
        return ctl;
    }
    void SetButtonCaption(Button b, string value) { var t = b.GetComponentInChildren<Text>(); if (t) t.text = value; }
    void Stretch(RectTransform t) { t.anchorMin = Vector2.zero; t.anchorMax = Vector2.one; t.offsetMin = Vector2.zero; t.offsetMax = Vector2.zero; }

    void ApplySafeArea()
    {
        if (!safeRoot || Screen.width == 0 || Screen.height == 0) return;
        Rect safe = Screen.safeArea;
        float frameWidth = Mathf.Min(safe.width, safe.height * 9f / 16f);
        float left = safe.xMin + (safe.width - frameWidth) * .5f;
        safeRoot.anchorMin = new Vector2(left / Screen.width, safe.yMin / Screen.height);
        safeRoot.anchorMax = new Vector2((left + frameWidth) / Screen.width, safe.yMax / Screen.height);
        safeRoot.offsetMin = Vector2.zero; safeRoot.offsetMax = Vector2.zero;
        view.rect = new Rect(left / Screen.width, safe.yMin / Screen.height, frameWidth / Screen.width, safe.height / Screen.height);
        view.orthographicSize = 20;
    }

    void Update()
    {
        ApplySafeArea();
        if (Input.GetKeyDown(KeyCode.Escape))
        {
            if (run.Phase == Phase.Playing) { Play(uiClickClip); run.Pause(); ClearInput(); ShowPhase(true); }
            else if (run.Phase == Phase.Paused) { Play(uiClickClip); run.Resume(); ClearInput(); ShowPhase(true); }
        }
        if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter))
        {
            if (run.Phase == Phase.Briefing) { Play(uiClickClip); ResetRun(); run.Start(); UpdateMusic(0); Play(dashClip); ShowPhase(true); }
            else if (run.Phase == Phase.Upgrade) ChooseUpgrade(0);
            else if (run.Phase == Phase.Paused) { Play(uiClickClip); run.Resume(); ClearInput(); UpdateMusic(0); ShowPhase(true); }
            else if (run.Phase == Phase.Won || run.Phase == Phase.Lost) { Play(uiClickClip); ResetRun(); run.Start(); UpdateMusic(0); ShowPhase(true); }
        }
        if (run.Phase == Phase.Upgrade)
        {
            if (Input.GetKeyDown(KeyCode.Alpha1)) ChooseUpgrade(0);
            if (Input.GetKeyDown(KeyCode.Alpha2)) ChooseUpgrade(1);
            if (Input.GetKeyDown(KeyCode.Alpha3)) ChooseUpgrade(2);
        }
        if (run.Phase != Phase.Playing) { UpdatePhase(); return; }
        var keyboard = new Vector2(
            (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) ? 1 : 0) - (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) ? 1 : 0),
            (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow) ? 1 : 0) - (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow) ? 1 : 0));
        Vector2 move = stick.sqrMagnitude > .001f ? stick : Vector2.ClampMagnitude(keyboard, 1);
        if (Input.GetKeyDown(KeyCode.Space)) dashQueued = true;
        float dt = Time.unscaledDeltaTime; hitStop = Mathf.Max(0, hitStop - dt); beamLifetime = Mathf.Max(0, beamLifetime - dt);
        if (hitStop <= 0)
        {
            accumulator = Mathf.Min(accumulator + dt, Run.StepSeconds * 5);
            while (accumulator >= Run.StepSeconds && run.Phase == Phase.Playing)
            {
                bool wasDashing = run.DashTime > 0; float hpBefore = run.Hp;
                run.Step(new Vec(move.x, move.y), dashQueued);
                dashQueued = false; accumulator -= Run.StepSeconds;
                if (!wasDashing && run.DashTime > 0) Play(dashClip);
                if (run.Hp < hpBefore) { Play(hitClip); hitStop = reducedMotion ? 0 : .045f; shake = reducedMotion ? 0 : .55f; }
                if (run.WardenDefeated && !seenBossDown) { Play(bossDownClip); hitStop = reducedMotion ? 0 : .07f; shake = reducedMotion ? 0 : .65f; seenBossDown = true; }
            }
        }
        SyncWorld(); UpdatePhase();
        hudRefresh -= dt; if (hudRefresh <= 0) { hudRefresh = .1f; RefreshHud(); }
        if (beamLifetime <= 0 && beam.gameObject.activeSelf) beam.gameObject.SetActive(false);
        shake = Mathf.Max(0, shake - dt * 2.5f);
        if (!reducedMotion && shake > 0)
        {
            float s = shake * shake;
            view.transform.position = new Vector3(
                ship.position.x + Mathf.Sin(Time.unscaledTime * 41) * s * .14f,
                ship.position.y + Mathf.Cos(Time.unscaledTime * 53) * s * .14f, -10);
        }
        else view.transform.position = new Vector3(ship.position.x, ship.position.y, -10);
        UpdateMusic(dt);
    }

    void SyncWorld()
    {
        ship.position = new Vector3(run.Position.X, run.Position.Y, 0);
        ship.rotation = Quaternion.Euler(0, 0, Mathf.Atan2(run.Facing.Y, run.Facing.X) * Mathf.Rad2Deg - 90);
        // Squash & stretch on dash for tactile game-feel when reducedMotion is off
        float dashStretch = (!reducedMotion && run.DashTime > 0) ? 1.18f : 1f;
        float dashSquash = (!reducedMotion && run.DashTime > 0) ? .86f : 1f;
        ship.localScale = new Vector3(1.05f * dashSquash, 1.05f * dashStretch, 1f);

        engineGlow.position = ship.position + new Vector3(-run.Facing.X, -run.Facing.Y, 0) * .45f;
        float pulse = .24f + Mathf.PingPong(Time.unscaledTime * 1.25f, .15f);
        engineGlow.localScale = Vector3.one * (run.DashTime > 0 ? .64f : pulse);
        dashRing.gameObject.SetActive(run.DashTime > 0);
        dashRing.position = ship.position;
        dashRing.localScale = Vector3.one * (1.25f + run.DashTime * 3.2f);

        for (int i = 0; i < run.Enemies.Count; i++)
        {
            var e = run.Enemies[i];
            if (i == enemies.Count)
            {
                var t = Make("Hostile", droneSprite, Color.white, .8f);
                enemies.Add(t); enemyRenderers.Add(t.GetComponent<SpriteRenderer>());
            }
            var tEnemy = enemies[i]; var sr = enemyRenderers[i];
            tEnemy.gameObject.SetActive(true);
            tEnemy.position = new Vector3(e.Position.X, e.Position.Y, 0);
            sr.sprite = SpriteFor(e.Kind);
            if (e.HitFlash > 0) sr.color = Ivory;
            else if (e.Telegraph > 0) sr.color = new Color(1f, .86f, .55f, .68f);
            else if (e.Kind == EnemyKind.Warden && run.WardenAttackTelegraph)
                sr.color = Color.Lerp(Color.white, Coral, .35f + .35f * Mathf.Sin(Time.unscaledTime * 18));
            else sr.color = Color.white;

            float hitPop = (!reducedMotion && e.HitFlash > 0) ? 1.14f : 1f;
            float size = e.Radius * 2.35f * hitPop;
            tEnemy.localScale = Vector3.one * size;
            Vec toPilot = run.Position - e.Position;
            float angle = e.Kind == EnemyKind.Warden
                ? Mathf.Sin(Time.unscaledTime * 1.6f + e.Id) * 8f
                : Mathf.Atan2(toPilot.Y, toPilot.X) * Mathf.Rad2Deg - 90f;
            tEnemy.rotation = Quaternion.Euler(0, 0, angle);
        }
        for (int i = run.Enemies.Count; i < enemies.Count; i++) enemies[i].gameObject.SetActive(false);

        for (int i = 0; i < run.Gems.Count; i++)
        {
            if (i == gems.Count) gems.Add(Make("Lumen shard", gemSprite, Color.white, .44f));
            var gem = gems[i]; gem.gameObject.SetActive(true);
            gem.position = new Vector3(run.Gems[i].X, run.Gems[i].Y, 0);
            var sr = gem.GetComponent<SpriteRenderer>();
            sr.sprite = (i == run.Gems.Count - 1 && run.WardenDefeated) ? coreSprite : gemSprite;
            if (!reducedMotion) gem.Rotate(0, 0, 90 * Time.unscaledDeltaTime);
        }
        for (int i = run.Gems.Count; i < gems.Count; i++) gems[i].gameObject.SetActive(false);
        if (run.LastPickupSerial > seenPickups) { Play(pickupClip); seenPickups = run.LastPickupSerial; }

        for (int i = 0; i < run.HostileShots.Count; i++)
        {
            if (i == hostileShots.Count) hostileShots.Add(Make("Warden bolt", fxHostileBeadSprite, Color.white, .52f));
            var bolt = hostileShots[i]; bolt.gameObject.SetActive(true);
            bolt.position = new Vector3(run.HostileShots[i].Position.X, run.HostileShots[i].Position.Y, -.1f);
            bolt.rotation = Quaternion.Euler(0, 0, Mathf.Atan2(run.HostileShots[i].Velocity.Y, run.HostileShots[i].Velocity.X) * Mathf.Rad2Deg);
        }
        for (int i = run.HostileShots.Count; i < hostileShots.Count; i++) hostileShots[i].gameObject.SetActive(false);

        extractionMarker.gameObject.SetActive(run.ExtractionActive);
        extractionMarker.localScale = Vector3.one * (2.6f + (reducedMotion ? 0 : Mathf.Sin(Time.unscaledTime * 4) * .22f));

        var warden = run.Enemies.Find(e => e.Kind == EnemyKind.Warden);
        bossTellRing.gameObject.SetActive(warden != null && run.WardenAttackTelegraph);
        safeLane.gameObject.SetActive(warden != null && run.WardenAttackTelegraph);
        if (warden != null && run.WardenAttackTelegraph)
        {
            float safeAngleDeg = Mathf.Atan2(run.WardenSafeLaneDirection.Y, run.WardenSafeLaneDirection.X) * Mathf.Rad2Deg;
            bossTellRing.position = new Vector3(warden.Position.X, warden.Position.Y, .05f);
            bossTellRing.rotation = Quaternion.Euler(0, 0, safeAngleDeg);
            bossTellRing.localScale = Vector3.one * (3.1f + (reducedMotion ? 0 : Mathf.Sin(Time.unscaledTime * 14) * .2f));
            Vector3 from = new Vector3(warden.Position.X, warden.Position.Y, -.02f);
            Vector2 lane = new Vector2(run.WardenSafeLaneDirection.X, run.WardenSafeLaneDirection.Y);
            Vector3 delta = new Vector3(lane.x, lane.y, 0) * 14f;
            safeLane.position = from + delta * .5f;
            safeLane.rotation = Quaternion.Euler(0, 0, safeAngleDeg);
            safeLane.localScale = new Vector3(delta.magnitude, .45f, 1);
        }
        if (run.DashSerial != seenDash)
        {
            if (run.PhaseReturnStacks > 0 && !reducedMotion)
            {
                var emit = new ParticleSystem.EmitParams { position = ship.position, startColor = Cyan };
                burst.Emit(emit, 28);
            }
            seenDash = run.DashSerial;
        }
        if (run.BossAttackSerial != seenBossAttack)
        {
            Play(bossVolleyClip);
            if (!reducedMotion)
            {
                var emit = new ParticleSystem.EmitParams { position = warden == null ? ship.position : new Vector3(warden.Position.X, warden.Position.Y, 0), startColor = Coral };
                burst.Emit(emit, 20);
            }
            seenBossAttack = run.BossAttackSerial;
        }
        if (run.Kills > seenKills)
        {
            if (!reducedMotion)
            {
                int n = Mathf.Min(10 + (run.Kills - seenKills) * 3, 22);
                var emit = new ParticleSystem.EmitParams { position = new Vector3(run.LastShotTarget.X, run.LastShotTarget.Y, 0), startColor = Amber };
                burst.Emit(emit, n);
            }
            Play(killClip);
            shake = reducedMotion ? 0 : Mathf.Max(shake, .22f);
            seenKills = run.Kills;
        }
        if (run.Shots != seenShots)
        {
            Vector3 from = ship.position, to = new Vector3(run.LastShotTarget.X, run.LastShotTarget.Y, 0), delta = to - from;
            beam.transform.position = (from + to) * .5f + Vector3.back * .2f;
            beam.transform.rotation = Quaternion.Euler(0, 0, Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg);
            beam.transform.localScale = new Vector3(Mathf.Max(.15f, delta.magnitude), .18f, 1);
            beam.gameObject.SetActive(true); beamLifetime = .06f;
            bool armoredTarget = run.LastHitTargetKind == EnemyKind.Bastion || run.LastHitTargetKind == EnemyKind.Warden;
            Play(armoredTarget ? armorHitClip : shotClip);
            seenShots = run.Shots;
        }
    }

    Sprite SpriteFor(EnemyKind kind) => kind == EnemyKind.Skitter ? skitterSprite : kind == EnemyKind.Bastion ? bastionSprite : kind == EnemyKind.Warden ? wardenSprite : droneSprite;

    void RefreshHud()
    {
        timerText.text = string.Format("{0:00}:{1:00}", Mathf.CeilToInt(Mathf.Max(0, Run.Duration - run.Time)) / 60, Mathf.CeilToInt(Mathf.Max(0, Run.Duration - run.Time)) % 60);
        healthText.text = $"{L("선체", "HULL", "装甲", "装甲", "COQUE", "BLINDAJE")}  {Mathf.CeilToInt(run.Hp):000}/{Mathf.CeilToInt(run.MaxHp):000}";
        healthFill.fillAmount = run.Hp / run.MaxHp;
        healthFill.color = run.Hp < 35 ? Coral : Cyan;
        xpFill.fillAmount = run.XpNeeded > 0 ? (float)run.XpProgress / run.XpNeeded : 0;
        levelText.text = $"LV  {run.Level:00}";
        killsText.text = $"{L("격추", "ELIMINATIONS", "撃破", "击破", "ÉLIMINATIONS", "ELIMINACIONES")}  {run.Kills:00}     ·     {run.Time:000}s";
        bool boss = run.WardenSpawned && !run.WardenDefeated && run.Phase == Phase.Playing;
        var bossPanel = hudScreen.transform.Find("Warden health panel");
        if (bossPanel) bossPanel.gameObject.SetActive(boss);
        if (boss)
        {
            bossFill.fillAmount = Mathf.Clamp01(run.WardenHp / BalanceConfig.WardenHealth);
            bossText.text = L("파수자", "THE WARDEN", "WARDEN", "守望者", "LE GARDIEN", "EL GUARDIÁN");
        }
        warningText.gameObject.SetActive(run.WardenWarning && !run.WardenSpawned);
        warningText.text = L("파수자 접근 경보 · 06초", "WARDEN INBOUND · 06 SEC", "守護者接近 · 06秒", "守望者接近 · 06秒", "GARDIEN · 06 S", "GUARDIÁN · 06 S");
        objectiveText.gameObject.SetActive(run.ExtractionActive);
        objectiveText.text = L("추출 지점으로 이동", "MOVE TO EXTRACTION", "脱出地点へ移動", "前往撤离点", "REJOIGNEZ L’EXTRACTION", "VE A LA EXTRACCIÓN");
        if (run.WardenWarning && !seenBossWarning) { Play(bossWarnClip); seenBossWarning = true; }
        dashLabel.text = run.DashCooldown <= 0 ? L("대시", "DASH", "ダッシュ", "冲刺", "DASH", "IMPULSO") : run.DashCooldown.ToString("0.0") + "s";
    }

    string BuildSummary()
    {
        var parts = new List<string>();
        foreach (var spec in UpgradeCatalog.Entries)
        {
            int count = run.UpgradeStacks(spec.Id);
            if (count > 0) parts.Add($"{spec.Names[language]} ×{count}");
        }
        return parts.Count > 0 ? string.Join(" · ", parts) : L("기본 장비", "BASE LOADOUT", "初期装備", "基础装备", "ÉQUIPEMENT DE BASE", "EQUIPO BASE");
    }

    string SurvivalGrade(bool win)
    {
        if (win && run.WardenDefeated) return "S";
        if (win) return "A";
        if (run.WardenDefeated || run.Time >= 150f) return "B";
        if (run.Time >= 90f) return "C";
        return "D";
    }

    void UpdatePhase()
    {
        if ((int)run.Phase == seenPhase) return;
        ShowPhase(false); seenPhase = (int)run.Phase;
        if (run.Phase == Phase.Upgrade)
        {
            for (int i = 0; i < 3; i++)
            {
                bool available = i < run.Choices.Count;
                upgradeButtons[i].interactable = available;
                var cardImg = upgradeButtons[i].GetComponent<Image>();
                if (available)
                {
                    Upgrade u = run.Choices[i];
                    var spec = UpgradeCatalog.Get(u);
                    string tier = spec.Tier == UpgradeTier.Prismatic
                        ? L("프리즈매틱", "PRISMATIC", "プリズマティック", "棱彩", "PRISMATIQUE", "PRISMÁTICO")
                        : spec.Tier == UpgradeTier.Gold
                        ? L("골드", "GOLD", "ゴールド", "金色", "OR", "ORO")
                        : L("실버", "SILVER", "シルバー", "银色", "ARGENT", "PLATA");
                    int nextStack = run.UpgradeStacks(u) + 1;
                    upgradeTitles[i].text = $"{tier}  ·  {UpgradeName(u)} ({nextStack}/{spec.MaxStacks})\n{UpgradeDescription(u)}";
                    upgradeTitles[i].fontSize = 22;
                    cardImg.sprite = spec.Tier == UpgradeTier.Prismatic ? framePrismaticSprite : spec.Tier == UpgradeTier.Gold ? frameGoldSprite : frameSilverSprite;
                    cardImg.color = Color.white;
                }
                else
                {
                    upgradeTitles[i].text = L("더 강해질 선택지가 없습니다", "NO FURTHER UPGRADES", "強化の選択肢がありません", "没有可选强化", "PLUS D’AMÉLIORATION", "NO HAY MÁS MEJORAS");
                    cardImg.sprite = frameSilverSprite;
                    cardImg.color = new Color(1, 1, 1, .5f);
                }
            }
            Play(upgradeClip);
            FocusControl(upgradeButtons[0]);
        }
        if (run.Phase == Phase.Won || run.Phase == Phase.Lost)
        {
            bool win = run.Phase == Phase.Won;
            Play(win ? winClip : loseClip);
            if (musicSource.isPlaying) musicSource.Stop();
            string grade = SurvivalGrade(win);
            resultTitleText.text = (win
                ? L("탈출 성공", "EXTRACTION", "脱出成功", "成功撤离", "EXTRACTION", "EXTRACCIÓN")
                : L("신호 두절", "SIGNAL LOST", "機体損壊", "信号中断", "SIGNAL PERDU", "SEÑAL PERDIDA")) + $"  [{grade}]";
            resultTitleText.color = win ? Cyan : Coral;
            string cause = win
                ? L("궤도 추출 게이트 진입 완료", "EXTRACTION COMPLETE", "脱出ゲート到達", "成功进入撤离门", "EXTRACTION RÉUSSIE", "EXTRACCIÓN COMPLETADA")
                : run.FailureReason == "extraction"
                ? L("추출 지점에 도달하지 못했습니다", "EXTRACTION ZONE MISSED", "脱出地点に到達できません", "未能到达撤离区", "ZONE D’EXTRACTION MANQUÉE", "NO LLEGASTE A LA EXTRACCIÓN")
                : L("선체가 파괴되었습니다", "HULL BREACHED", "船体損傷", "船体被击毁", "COQUE DÉTRUITE", "CASCO DESTRUIDO");
            string bossResult = run.WardenDefeated
                ? L("파수자 격침", "WARDEN DEFEATED", "守護者撃破", "已击败守望者", "GARDIEN VAINCU", "GUARDIÁN DERROTADO")
                : L("파수자 생존", "WARDEN SURVIVED", "守護者生存", "守望者存活", "GARDIEN EN VIE", "GUARDIÁN VIVO");
            resultStatsText.text = $"{run.Time:0}s   ·   {run.Kills:00} {L("격추", "HOSTILES", "撃破", "击破", "ENNEMIS", "ENEMIGOS")}   ·   LV {run.Level:00}\n{cause}  ·  {bossResult}\n{BuildSummary()}";
            int best = Mathf.Max(PlayerPrefs.GetInt(SaveKey + ".best", 0), Mathf.RoundToInt(run.Time));
            PlayerPrefs.SetInt(SaveKey + ".best", best); PlayerPrefs.Save();
            bestText.text = $"{L("최고 생존", "BEST SURVIVAL", "最高生存", "最佳生存", "RECORD", "MEJOR MARCA")} {best}s   ·   SEED #{run.Seed}";
            var again = resultScreen.transform.Find("Report veil/Report card/Play again/Label");
            if (again) again.GetComponent<Text>().text = L("다시 출격", "PLAY AGAIN", "もう一度出撃", "再次出发", "REJOUER", "JUGAR DE NUEVO");
            FocusControl(playAgainButton);
        }
    }

    void FocusControl(Selectable s)
    {
        if (s != null && EventSystem.current != null) EventSystem.current.SetSelectedGameObject(s.gameObject);
    }

    void ShowPhase(bool force)
    {
        if (titleScreen == null) return;
        titleScreen.SetActive(run.Phase == Phase.Briefing);
        hudScreen.SetActive(run.Phase == Phase.Playing || run.Phase == Phase.Upgrade);
        pauseScreen.SetActive(run.Phase == Phase.Paused);
        upgradeScreen.SetActive(run.Phase == Phase.Upgrade);
        resultScreen.SetActive(run.Phase == Phase.Won || run.Phase == Phase.Lost);
        if (run.Phase == Phase.Briefing)
        {
            menuTitleText.text = "NEON\nSURVIVOR";
            menuSubtitleText.text = L("어둠 속 마지막 불빛", "A LAST LIGHT IN THE DARK", "闇に残る、最後の光", "黑暗中的最后一道光", "UNE DERNIÈRE LUEUR", "LA ÚLTIMA LUZ EN LA OSCURIDAD");
            controlsText.text = L("이동  왼쪽 스틱 / WASD\n대시  오른쪽 버튼 / Space\n주포는 자동으로 발사됩니다", "MOVE   LEFT STICK / WASD\nDASH   RIGHT BUTTON / SPACE\nYOUR CANNON FIRES AUTOMATICALLY", "移動   左スティック / WASD\nダッシュ   右ボタン / Space\n主砲は自動発射", "移动   左侧摇杆 / WASD\n冲刺   右侧按钮 / Space\n主炮自动发射", "BOUGER   STICK GAUCHE / WASD\nDASH   BOUTON DROIT / ESPACE", "MOVER   CONTROL IZQUIERDO / WASD\nIMPULSO   BOTÓN DERECHO / ESPACIO");
            var launch = titleScreen.transform.Find("Title card/Launch/Label");
            if (launch) launch.GetComponent<Text>().text = L("출격 시작", "BEGIN DESCENT", "出撃する", "开始行动", "DÉMARRER", "INICIAR DESCENSO");
            var lang = titleScreen.transform.Find("Language/Label");
            if (lang) lang.GetComponent<Text>().text = new[] { "한국어 · 설정", "EN · SETTINGS", "日本語 · 設定", "简体中文 · 设置", "FR · OPTIONS", "ES · OPCIONES" }[language];
            FocusControl(launchButton);
        }
        if (run.Phase == Phase.Paused)
        {
            const string root = "Pause veil/Pause card/";
            var title = pauseScreen.transform.Find(root + "Pause title");
            if (title) title.GetComponent<Text>().text = L("일시 정지", "PAUSED", "一時停止", "暂停", "PAUSE", "PAUSA");
            var t = pauseScreen.transform.Find(root + "Continue/Label");
            if (t) t.GetComponent<Text>().text = L("계속하기", "RESUME", "再開", "继续", "REPRENDRE", "CONTINUAR");
            var retry = pauseScreen.transform.Find(root + "Retry/Label");
            if (retry) retry.GetComponent<Text>().text = L("다시 출격", "RESTART", "再出撃", "重新开始", "RECOMMENCER", "REINICIAR");
            var s = pauseScreen.transform.Find(root + "Sound/Label");
            if (s) s.GetComponent<Text>().text = L(sfxOn ? "효과음  켬" : "효과음  끔", sfxOn ? "SFX  ON" : "SFX  OFF", sfxOn ? "効果音  ON" : "効果音  OFF", sfxOn ? "音效  开" : "音效  关", sfxOn ? "SON  ON" : "SON  OFF", sfxOn ? "SONIDO  ON" : "SONIDO  OFF");
            var m = pauseScreen.transform.Find(root + "Music/Label");
            if (m) m.GetComponent<Text>().text = L(musicOn ? "음악  켬" : "음악  끔", musicOn ? "MUSIC  ON" : "MUSIC  OFF", musicOn ? "音楽  ON" : "音楽  OFF", musicOn ? "音乐  开" : "音乐  关", musicOn ? "MUSIQUE  ON" : "MUSIQUE  OFF", musicOn ? "MÚSICA  ON" : "MÚSICA  OFF");
            var motion = pauseScreen.transform.Find(root + "Motion/Label");
            if (motion) motion.GetComponent<Text>().text = L(reducedMotion ? "움직임 줄임  켬" : "움직임 줄임  끔", reducedMotion ? "REDUCED MOTION  ON" : "REDUCED MOTION  OFF", reducedMotion ? "動きを減らす  ON" : "動きを減らす  OFF", reducedMotion ? "减少动态效果  开" : "减少动态效果  关", reducedMotion ? "MOUVEMENT RÉDUIT  ON" : "MOUVEMENT RÉDUIT  OFF", reducedMotion ? "MOVIMIENTO REDUCIDO  ON" : "MOVIMIENTO REDUCIDO  OFF");
            FocusControl(continueButton);
        }
        if (run.Phase == Phase.Upgrade)
        {
            var eyebrow = upgradeScreen.transform.Find("Choice veil/Choice panel/Choice eyebrow");
            if (eyebrow) eyebrow.GetComponent<Text>().text = run.IsBonusChoice
                ? L("파수자 코어 확보", "WARDEN CORE RECOVERED", "守護者コア回収", "已回收守望者核心", "NOYAU DU GARDIEN RÉCUPÉRÉ", "NÚCLEO DEL GUARDIÁN RECUPERADO")
                : L("전술 적응", "FIELD ADAPTATION", "戦術適応", "战术适配", "ADAPTATION", "ADAPTACIÓN");
            var heading = upgradeScreen.transform.Find("Choice veil/Choice panel/Choice heading");
            if (heading) heading.GetComponent<Text>().text = L("다음 생존법을\n선택하세요", "CHOOSE YOUR\nNEXT VECTOR", "次の戦術を\n選択", "选择你的\n生存策略", "CHOISISSEZ\nVOTRE STRATÉGIE", "ELIGE TU\nESTRATEGIA");
            var footer = upgradeScreen.transform.Find("Choice veil/Choice panel/Choice footer");
            if (footer) footer.GetComponent<Text>().text = L("하나의 선택, 달라지는 생존 전략", "ONE CHOICE. A NEW SURVIVAL PLAN.", "一つの選択が生存戦略を変える", "一次选择，改变生存策略", "UN CHOIX, UNE NOUVELLE STRATÉGIE", "UNA ELECCIÓN. UNA NUEVA ESTRATEGIA.");
        }
        if (force) RefreshHud();
    }

    string UpgradeName(Upgrade u) => UpgradeCatalog.Get(u).Names[language];
    string UpgradeDescription(Upgrade u) => UpgradeCatalog.Get(u).Descriptions[language];
    string L(string ko, string en, string ja, string zh, string fr, string es) => language == 1 ? en : language == 2 ? ja : language == 3 ? zh : language == 4 ? fr : language == 5 ? es : ko;

    void ChooseUpgrade(int index) { if (index < 0 || index >= run.Choices.Count) return; run.Choose(run.Choices[index]); Play(upgradeClip); ShowPhase(true); }
    void ResetRun() { nextRunSeed = nextRunSeed * 1664525 + 1013904223; run = new Run(nextRunSeed); ClearInput(); accumulator = 0; hitStop = 0; seenPhase = -1; seenKills = 0; seenShots = 0; seenPickups = 0; seenBossAttack = 0; seenDash = 0; seenBossWarning = false; seenBossDown = false; }
    void ClearInput() { pointer = -1; stick = Vector2.zero; dashQueued = false; accumulator = 0; if (stickControl) stickControl.ResetStick(); }
    void CycleLanguage() { language = (language + 1) % 6; PlayerPrefs.SetInt(SaveKey + ".language", language); foreach (var text in safeRoot.GetComponentsInChildren<Text>(true)) text.font = LocaleFont(); ShowPhase(true); }
    void ToggleSfx() { sfxOn = !sfxOn; PlayerPrefs.SetInt(SaveKey + ".sfx", sfxOn ? 1 : 0); ShowPhase(true); }
    void ToggleMusic() { musicOn = !musicOn; PlayerPrefs.SetInt(SaveKey + ".music", musicOn ? 1 : 0); UpdateMusic(0); ShowPhase(true); }
    void ToggleMotion() { reducedMotion = !reducedMotion; PlayerPrefs.SetInt(SaveKey + ".motion", reducedMotion ? 1 : 0); if (reducedMotion) { shake = 0; hitStop = 0; } ShowPhase(true); }
    void Play(AudioClip clip)
    {
        if (!sfxOn || !sfxSource || !clip) return;
        sfxSource.pitch = UnityEngine.Random.Range(.95f, 1.05f);
        sfxSource.PlayOneShot(clip, UnityEngine.Random.Range(.92f, 1.04f));
    }
    void UpdateMusic(float dt)
    {
        if (musicOn && !musicSource.isPlaying && run.Phase == Phase.Playing) musicSource.Play();
        if ((!musicOn || run.Phase != Phase.Playing) && musicSource.isPlaying) musicSource.Stop();
    }
    public void SetStick(Vector2 value, int id) { pointer = id; stick = Vector2.ClampMagnitude(value, 1); }
    public void EndStick(int id) { if (pointer == id) { pointer = -1; stick = Vector2.zero; } }
    void OnApplicationFocus(bool focused) { if (!focused && run.Phase == Phase.Playing) { run.Pause(); ClearInput(); ShowPhase(true); } }
    void OnApplicationPause(bool paused) { if (paused && run.Phase == Phase.Playing) { run.Pause(); ClearInput(); ShowPhase(true); } }

    Transform Make(string name, Sprite sprite, Color color, float size)
    {
        var go = new GameObject(name); go.transform.SetParent(transform, false);
        var sr = go.AddComponent<SpriteRenderer>(); sr.sprite = sprite; sr.color = color;
        go.transform.localScale = Vector3.one * size; return go.transform;
    }
    Transform MakePart(Transform parent, string name, Sprite sprite, Color color, float size, Vector2 localPosition, int order)
    {
        var part = Make(name, sprite, color, size); part.SetParent(parent, false);
        part.localPosition = new Vector3(localPosition.x, localPosition.y, -.05f);
        part.GetComponent<SpriteRenderer>().sortingOrder = order; return part;
    }

    static Sprite PolygonSprite(string name, Vector2[] points)
    {
        const int n = 96; var tex = new Texture2D(n, n, TextureFormat.RGBA32, false, true); tex.name = name; tex.filterMode = FilterMode.Bilinear; var pixels = new Color[n * n];
        for (int y = 0; y < n; y++) for (int x = 0; x < n; x++)
        {
            Vector2 p = new Vector2((x + .5f) / n * 2 - 1, (y + .5f) / n * 2 - 1); bool inside = false;
            for (int i = 0, j = points.Length - 1; i < points.Length; j = i++)
                if (((points[i].y > p.y) != (points[j].y > p.y)) && (p.x < (points[j].x - points[i].x) * (p.y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) inside = !inside;
            if (inside) { float edge = Mathf.Min(n - x, x, n - y, y); pixels[y * n + x] = new Color(1, 1, 1, Mathf.Clamp01(edge / 2)); }
        }
        tex.SetPixels(pixels); tex.Apply(false, true); return Sprite.Create(tex, new Rect(0, 0, n, n), new Vector2(.5f, .5f), n, 0, SpriteMeshType.Tight);
    }
    static Sprite CircleSprite(string name)
    {
        const int n = 64; var tex = new Texture2D(n, n, TextureFormat.RGBA32, false, true); tex.name = name; tex.filterMode = FilterMode.Bilinear; var px = new Color[n * n];
        for (int y = 0; y < n; y++) for (int x = 0; x < n; x++)
        {
            float d = Vector2.Distance(new Vector2(x + .5f, y + .5f), new Vector2(n / 2f, n / 2f)) / (n * .5f);
            px[y * n + x] = new Color(1, 1, 1, Mathf.Clamp01((1 - d) * n * .45f));
        }
        tex.SetPixels(px); tex.Apply(false, true); return Sprite.Create(tex, new Rect(0, 0, n, n), new Vector2(.5f, .5f), n);
    }
    static Sprite BackgroundSprite()
    {
        const int w = 256, h = 384; var tex = new Texture2D(w, h, TextureFormat.RGBA32, false, true); tex.name = "Neon orbital field"; tex.filterMode = FilterMode.Bilinear; var px = new Color[w * h]; uint seed = 741223;
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++)
        {
            float u = x / (float)w, v = y / (float)h;
            float band = Mathf.Exp(-Mathf.Pow((u - .25f + .09f * Mathf.Sin(v * 8)) * 5, 2)) * .18f + Mathf.Exp(-Mathf.Pow((u - .78f - .08f * Mathf.Sin(v * 6)) * 6, 2)) * .13f;
            float glow = Mathf.Exp(-Mathf.Pow((u - .5f) * 2, 2) - Mathf.Pow((v - .76f) * 2.5f, 2)) * .055f;
            seed = seed * 1664525 + 1013904223; float grain = ((seed >> 24) / 255f - .5f) * .018f;
            px[y * w + x] = new Color(.018f + band * .13f + glow * .15f + grain, .034f + band * .43f + glow * .56f + grain, .062f + band * .65f + glow * .9f + grain, 1);
        }
        tex.SetPixels(px); tex.Apply(false, true); return Sprite.Create(tex, new Rect(0, 0, w, h), new Vector2(.5f, .5f), 4);
    }
    static Sprite RoundedSprite(string name)
    {
        const int n = 48; float radius = 9; var tex = new Texture2D(n, n, TextureFormat.RGBA32, false, true); tex.name = name; tex.filterMode = FilterMode.Bilinear; var px = new Color[n * n];
        for (int y = 0; y < n; y++) for (int x = 0; x < n; x++)
        {
            float dx = Mathf.Max(Mathf.Abs(x + .5f - n / 2f) - (n / 2f - radius), 0), dy = Mathf.Max(Mathf.Abs(y + .5f - n / 2f) - (n / 2f - radius), 0);
            float d = Mathf.Sqrt(dx * dx + dy * dy); px[y * n + x] = new Color(1, 1, 1, Mathf.Clamp01(radius + .5f - d));
        }
        tex.SetPixels(px); tex.Apply(false, true); return Sprite.Create(tex, new Rect(0, 0, n, n), new Vector2(.5f, .5f), n, 0, SpriteMeshType.FullRect, new Vector4(radius, radius, radius, radius));
    }

    public sealed class StickControl : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler, ICancelHandler
    {
        public SlicePlayer Owner; Vector2 center; int active = -100;
        public void OnPointerDown(PointerEventData e) { active = e.pointerId; center = e.position; UpdateStick(e); }
        public void OnDrag(PointerEventData e) { if (active == e.pointerId) UpdateStick(e); }
        void UpdateStick(PointerEventData e)
        {
            RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)transform, e.position, e.pressEventCamera, out var p);
            float radius = ((RectTransform)transform).rect.width * .34f;
            Owner.SetStick(p / radius, e.pointerId);
        }
        public void OnPointerUp(PointerEventData e) { Owner.EndStick(e.pointerId); active = -100; }
        public void OnCancel(BaseEventData e) { Owner.ClearInput(); active = -100; }
        public void ResetStick() { active = -100; }
    }
}
