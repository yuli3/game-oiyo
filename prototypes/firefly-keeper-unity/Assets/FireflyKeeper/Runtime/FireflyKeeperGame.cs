using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace FireflyKeeper
{
    /// <summary>
    /// Firefly Keeper — original OIYO game. Lead fireflies through a dark wood to light lanterns.
    /// Everything (scene, UI, sounds) is built from code so the project needs no hand-made scene.
    /// </summary>
    public class FireflyKeeperGame : MonoBehaviour
    {
        enum Phase { Title, Select, Play, Paused, Result, Ending }

        const string SaveKey = "oiyo.fireflyKeeper.v1";
        const float MaxSpeed = 5.2f;
        const float PlayerRadius = 0.36f;
        const float Spacing = 0.5f;

        static readonly Color Ivory = new Color(1f, 0.96f, 0.86f);
        static readonly Color Gold = new Color(1f, 0.82f, 0.36f);
        static readonly Color Mint = new Color(0.55f, 1f, 0.78f);
        static readonly Color Night = new Color(0.02f, 0.04f, 0.08f);
        static readonly Color PanelBg = new Color(0.03f, 0.07f, 0.11f, 0.92f);
        static readonly Color ButtonBg = new Color(0.1f, 0.22f, 0.26f, 0.96f);
        static readonly Color ButtonHot = new Color(0.86f, 0.62f, 0.2f, 0.98f);
        static readonly Color ShadowCol = new Color(0.16f, 0.05f, 0.24f);

        class Fly
        {
            public Transform t; public SpriteRenderer sr, glow;
            public Vector2 home, pos, vel;
            public int state; // 0 wild, 1 follow, 2 inside shrine, 3 dazed, 4 flying in
            public float timer, phase;
            public bool skittish;
            public Shrine target;
        }

        class Enemy
        {
            public Transform t; public SpriteRenderer body, eye;
            public EnemyDef def; public Vector2 pos, vel; public int pathIdx; public float phase;
        }

        class Shrine
        {
            public Transform t; public SpriteRenderer sr, glow; public TextMesh label;
            public Vector2 pos; public int need, have, pending, index; public bool isGoal, done; public float pulse;
        }

        class Gate { public SpriteRenderer sr; public Rect rect; public int sw; public bool open; public float fade = 1f; }
        class Wind { public Rect rect; public Vector2 force; public readonly List<Transform> motes = new List<Transform>(); }
        class Dew { public Transform t; public SpriteRenderer sr; public Vector2 pos; public bool taken; public float respawn; }
        class Spark { public Transform t; public SpriteRenderer sr; public Vector2 vel; public float life, maxLife, size; }
        class Beam { public Transform t; public SpriteRenderer sr; public float life; }

        // ---------- resources ----------
        Sprite sLit, sDim, sLantern, sTalisman, sHeart, sStar, sDew, sCompass, sKey, sStone, sTrophy, sSpark, sGlow, sWhite, sCampfire;
        Font fontKo, fontJa, fontZh;
        AudioSource sfx, music;
        AudioClip cPick, cDrop, cHit, cGate, cClear, cFail, cClick, cBeam, cDew, cPad;

        // ---------- settings / save ----------
        int lang;
        bool muted;
        readonly int[] bestStars = new int[FkStages.Count];
        readonly float[] bestTime = new float[FkStages.Count];

        // ---------- scene ----------
        Camera cam;
        Vector3 camBase;
        float shake;
        Transform world;
        Phase phase = Phase.Title;

        // ---------- UI ----------
        Canvas canvas; CanvasScaler scaler; RectTransform canvasRect, uiRoot;
        GameObject titlePanel, selectPanel, hudPanel, pausePanel, resultPanel, endingPanel;
        Text hudCount, hudTime, hudStage, toastTitle, toastBody, msgText, resultTitle, resultTime;
        Image oilFill, bossFill; GameObject bossBar; Image hudCountIcon;
        Image[] hudHearts = new Image[3];
        Image[] resultStars = new Image[3]; Text[] resultStarLabels = new Text[3];
        GameObject nextButton; Text nextLabel;
        CanvasGroup toastGroup; float toastTimer; float msgTimer;
        RectTransform joyRing, joyKnob;

        // ---------- stage state ----------
        int stageIndex;
        StageDef def;
        readonly List<Fly> flies = new List<Fly>();
        readonly List<Fly> chain = new List<Fly>();
        readonly List<Enemy> enemies = new List<Enemy>();
        readonly List<Shrine> shrines = new List<Shrine>();
        readonly List<Gate> gates = new List<Gate>();
        readonly List<Wind> winds = new List<Wind>();
        readonly List<Dew> dews = new List<Dew>();
        readonly List<Spark> sparks = new List<Spark>();
        readonly List<Beam> beams = new List<Beam>();
        Transform playerT; SpriteRenderer playerSr, playerGlow;
        Vector2 pPos, pVel;
        float invuln, oil, elapsed, dropCd, endTimer;
        int hearts, delivered;
        bool noHit, ending, cleared;
        string failKey;

        // boss
        Transform bossT; SpriteRenderer bossSr, bossEye;
        Vector2 bossPos, bossDashDir;
        int bossHp;
        float bossAngle, bossDashTimer, bossDashLeft, minionTimer, bossFlash;

        // input
        bool dragging; Vector2 dragAnchor; Vector2 dragCurrent;

        // =====================================================================
        void Start()
        {
            Application.targetFrameRate = 60;
            LoadResources();
            LoadSave();
            int urlLang = FkLocale.FromCode(QueryParam("lang"));
            if (urlLang >= 0) lang = urlLang;
            SetupCamera();
            SetupAudio();
            BuildUI();
            int qs;
            if (int.TryParse(QueryParam("stage"), out qs) && qs >= 1 && qs <= FkStages.Count && IsUnlocked(qs - 1)) StartStage(qs - 1);
            else ShowPhase(Phase.Title);
        }

        static string QueryParam(string key)
        {
            string url = Application.absoluteURL;
            if (string.IsNullOrEmpty(url)) return null;
            int q = url.IndexOf('?');
            if (q < 0) return null;
            string query = url.Substring(q + 1);
            int hash = query.IndexOf('#');
            if (hash >= 0) query = query.Substring(0, hash);
            foreach (var part in query.Split('&'))
            {
                int eq = part.IndexOf('=');
                if (eq > 0 && part.Substring(0, eq) == key) return Uri.UnescapeDataString(part.Substring(eq + 1));
            }
            return null;
        }

        // ---------- resources ----------
        Sprite Load(string name)
        {
            var tex = Resources.Load<Texture2D>("FK/" + name);
            if (tex == null)
            {
                Debug.LogWarning("FireflyKeeper: missing texture " + name);
                return sWhite;
            }
            tex.wrapMode = TextureWrapMode.Clamp;
            return Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), new Vector2(0.5f, 0.5f), tex.width, 0, SpriteMeshType.FullRect);
        }

        void LoadResources()
        {
            var white = new Texture2D(4, 4);
            var px = new Color[16];
            for (int i = 0; i < px.Length; i++) px[i] = Color.white;
            white.SetPixels(px); white.Apply();
            sWhite = Sprite.Create(white, new Rect(0, 0, 4, 4), new Vector2(0.5f, 0.5f), 4, 0, SpriteMeshType.FullRect);

            const int g = 64;
            var glowTex = new Texture2D(g, g, TextureFormat.RGBA32, false);
            glowTex.wrapMode = TextureWrapMode.Clamp;
            var gp = new Color[g * g];
            for (int y = 0; y < g; y++)
                for (int x = 0; x < g; x++)
                {
                    float dx = (x + 0.5f) / g * 2f - 1f, dy = (y + 0.5f) / g * 2f - 1f;
                    float d = Mathf.Clamp01(Mathf.Sqrt(dx * dx + dy * dy));
                    float a = (1f - d); a = a * a;
                    gp[y * g + x] = new Color(1f, 1f, 1f, a);
                }
            glowTex.SetPixels(gp); glowTex.Apply();
            sGlow = Sprite.Create(glowTex, new Rect(0, 0, g, g), new Vector2(0.5f, 0.5f), g, 0, SpriteMeshType.FullRect);

            sLit = Load("firefly-lit"); sDim = Load("firefly-dim"); sLantern = Load("lantern"); sTalisman = Load("talisman");
            sHeart = Load("heart"); sStar = Load("star"); sDew = Load("dew"); sCompass = Load("compass"); sKey = Load("keyart");
            sTrophy = Load("trophy"); sSpark = Load("spark"); sCampfire = Load("campfire");
            var stone = Resources.Load<Texture2D>("FK/stone");
            sStone = stone != null ? Sprite.Create(stone, new Rect(0, 0, stone.width, stone.height), new Vector2(0.5f, 0.5f), stone.width, 0, SpriteMeshType.FullRect) : sWhite;

            fontKo = Resources.Load<Font>("FK/Fonts/FkKR");
            fontJa = Resources.Load<Font>("FK/Fonts/FkJP");
            fontZh = Resources.Load<Font>("FK/Fonts/FkSC");
            if (fontKo == null) fontKo = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (fontJa == null) fontJa = fontKo;
            if (fontZh == null) fontZh = fontKo;
        }

        Font F => lang == 2 ? fontJa : lang == 3 ? fontZh : fontKo;

        string L(string key) => FkLocale.Get(key, lang);

        // ---------- save ----------
        void LoadSave()
        {
            lang = PlayerPrefs.GetInt(SaveKey + ".lang", 0);
            muted = PlayerPrefs.GetInt(SaveKey + ".muted", 0) == 1;
            string stars = PlayerPrefs.GetString(SaveKey + ".stars", "");
            string times = PlayerPrefs.GetString(SaveKey + ".times", "");
            var sp = stars.Split(',');
            var tp = times.Split(',');
            for (int i = 0; i < FkStages.Count; i++)
            {
                int s; float t;
                bestStars[i] = i < sp.Length && int.TryParse(sp[i], out s) ? Mathf.Clamp(s, 0, 3) : 0;
                bestTime[i] = i < tp.Length && float.TryParse(tp[i], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out t) ? t : 0f;
            }
        }

        void WriteSave()
        {
            var ts = new string[FkStages.Count];
            for (int i = 0; i < ts.Length; i++) ts[i] = bestTime[i].ToString("0.0", System.Globalization.CultureInfo.InvariantCulture);
            PlayerPrefs.SetString(SaveKey + ".stars", string.Join(",", Array.ConvertAll(bestStars, x => x.ToString())));
            PlayerPrefs.SetString(SaveKey + ".times", string.Join(",", ts));
            PlayerPrefs.SetInt(SaveKey + ".lang", lang);
            PlayerPrefs.SetInt(SaveKey + ".muted", muted ? 1 : 0);
            PlayerPrefs.Save();
        }

        bool IsUnlocked(int i) => i == 0 || bestStars[i - 1] > 0;

        int TotalStars()
        {
            int s = 0;
            foreach (var b in bestStars) s += b;
            return s;
        }

        // ---------- camera / audio ----------
        void SetupCamera()
        {
            var camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            cam = camGo.AddComponent<Camera>();
            cam.orthographic = true;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Night;
            cam.nearClipPlane = 0.1f; cam.farClipPlane = 100f;
            camBase = new Vector3(0f, 0.6f, -10f);
            cam.transform.position = camBase;
            camGo.AddComponent<AudioListener>();
            FitCamera();
        }

        void FitCamera()
        {
            float aspect = Mathf.Max(0.3f, (float)Screen.width / Mathf.Max(1, Screen.height));
            cam.orthographicSize = Mathf.Max(9.1f, 4.9f / aspect);
        }

        void SetupAudio()
        {
            sfx = gameObject.AddComponent<AudioSource>();
            sfx.playOnAwake = false;
            music = gameObject.AddComponent<AudioSource>();
            music.loop = true; music.playOnAwake = false; music.volume = 0.35f;
            cPick = FkSynth.Chime("pick", new[] { 1046.5f, 1568f }, 0.05f, 0.25f, 0.5f);
            cDrop = FkSynth.Chime("drop", new[] { 784f, 1174.7f }, 0.06f, 0.4f, 0.5f);
            cDew = FkSynth.Chime("dew", new[] { 1318.5f, 1760f, 2093f }, 0.04f, 0.3f, 0.35f);
            cGate = FkSynth.Chime("gate", new[] { 523.25f, 659.25f, 784f, 1046.5f }, 0.08f, 0.5f, 0.55f);
            cClear = FkSynth.Chime("clear", new[] { 523.25f, 587.33f, 784f, 880f, 1046.5f, 1318.5f }, 0.1f, 0.7f, 0.55f);
            cFail = FkSynth.Chime("fail", new[] { 392f, 329.63f, 261.63f, 196f }, 0.14f, 0.6f, 0.45f);
            cClick = FkSynth.Chime("click", new[] { 880f }, 0.02f, 0.08f, 0.3f);
            cBeam = FkSynth.Chime("beam", new[] { 1567.98f, 1046.5f, 783.99f, 1567.98f }, 0.05f, 0.6f, 0.6f);
            cHit = FkSynth.Thud("hit", 140f, 0.35f, 0.8f);
            cPad = FkSynth.Pad("pad", 12f);
            music.clip = cPad;
            ApplyMute();
        }

        void ApplyMute()
        {
            sfx.mute = muted; music.mute = muted;
            if (!music.isPlaying) music.Play();
        }

        void Play(AudioClip c, float vol = 1f)
        {
            if (!muted && c != null) sfx.PlayOneShot(c, vol);
        }

        // =====================================================================
        // UI
        // =====================================================================
        void BuildUI()
        {
            if (canvas != null) Destroy(canvas.gameObject);
            if (FindFirstObjectByType<EventSystem>() == null)
                new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));

            var cgo = new GameObject("UI", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvas = cgo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            scaler = cgo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasRect = cgo.GetComponent<RectTransform>();

            var rootGo = new GameObject("Root", typeof(RectTransform));
            uiRoot = rootGo.GetComponent<RectTransform>();
            uiRoot.SetParent(canvasRect, false);
            uiRoot.anchorMin = new Vector2(0.5f, 0f); uiRoot.anchorMax = new Vector2(0.5f, 1f);
            uiRoot.sizeDelta = new Vector2(1080, 0); uiRoot.anchoredPosition = Vector2.zero;

            BuildTitle();
            BuildSelect();
            BuildHud();
            BuildPause();
            BuildResult();
            BuildEnding();
            UpdateScaler();
        }

        void UpdateScaler()
        {
            if (scaler == null) return;
            float aspect = (float)Screen.width / Mathf.Max(1, Screen.height);
            scaler.matchWidthOrHeight = aspect > 0.5625f ? 1f : 0f;
            float w = canvasRect.rect.width;
            uiRoot.sizeDelta = new Vector2(Mathf.Min(w, 1180f), 0f);
        }

        RectTransform Rt(string name, Transform parent, Vector2 aMin, Vector2 aMax)
        {
            var go = new GameObject(name, typeof(RectTransform));
            var rt = go.GetComponent<RectTransform>();
            rt.SetParent(parent, false);
            rt.anchorMin = aMin; rt.anchorMax = aMax;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            return rt;
        }

        Image Box(string name, Transform parent, Color c, Vector2 aMin, Vector2 aMax, Sprite s = null, bool raycast = false)
        {
            var rt = Rt(name, parent, aMin, aMax);
            var img = rt.gameObject.AddComponent<Image>();
            img.color = c; img.sprite = s; img.raycastTarget = raycast;
            if (s != null) img.preserveAspect = true;
            return img;
        }

        Text Label(Transform parent, string value, int size, Color c, TextAnchor anchor, Vector2 aMin, Vector2 aMax, bool bold = false)
        {
            var rt = Rt("Text", parent, aMin, aMax);
            var t = rt.gameObject.AddComponent<Text>();
            t.font = F; t.text = value; t.fontSize = size; t.color = c; t.alignment = anchor;
            t.horizontalOverflow = HorizontalWrapMode.Wrap; t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false; t.lineSpacing = 1.1f;
            if (bold) t.fontStyle = FontStyle.Bold;
            var sh = rt.gameObject.AddComponent<Shadow>();
            sh.effectColor = new Color(0f, 0f, 0f, 0.6f); sh.effectDistance = new Vector2(2f, -2f);
            return t;
        }

        Button Btn(Transform parent, string value, Vector2 aMin, Vector2 aMax, Action onClick, Color bg, int size = 46)
        {
            var img = Box("Button", parent, bg, aMin, aMax, null, true);
            var b = img.gameObject.AddComponent<Button>();
            var colors = b.colors; colors.highlightedColor = new Color(1.15f, 1.15f, 1.15f); colors.pressedColor = new Color(0.8f, 0.8f, 0.8f); b.colors = colors;
            b.onClick.AddListener(() => { Play(cClick, 0.6f); if (onClick != null) onClick(); });
            var ol = img.gameObject.AddComponent<Outline>();
            ol.effectColor = new Color(1f, 0.9f, 0.6f, 0.35f); ol.effectDistance = new Vector2(2f, -2f);
            Label(img.transform, value, size, Ivory, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one, true);
            return b;
        }

        void BuildTitle()
        {
            titlePanel = Rt("Title", canvasRect, Vector2.zero, Vector2.one).gameObject;
            var bg = Box("KeyArt", titlePanel.transform, new Color(0.75f, 0.85f, 0.9f), Vector2.zero, Vector2.one, sKey);
            bg.preserveAspect = false;
            var fit = bg.gameObject.AddComponent<AspectRatioFitter>();
            fit.aspectMode = AspectRatioFitter.AspectMode.EnvelopeParent; fit.aspectRatio = 16f / 9f;
            Box("Veil", titlePanel.transform, new Color(0f, 0.02f, 0.05f, 0.45f), Vector2.zero, Vector2.one);

            var col = Rt("Column", titlePanel.transform, new Vector2(0.5f, 0f), new Vector2(0.5f, 1f));
            col.sizeDelta = new Vector2(1000, 0);
            Box("Lantern", col, Color.white, new Vector2(0.38f, 0.66f), new Vector2(0.62f, 0.8f), sLantern);
            Label(col, L("title"), 104, Gold, TextAnchor.MiddleCenter, new Vector2(0.02f, 0.55f), new Vector2(0.98f, 0.66f), true);
            Label(col, L("subtitle"), 40, Ivory, TextAnchor.MiddleCenter, new Vector2(0.06f, 0.49f), new Vector2(0.94f, 0.55f));
            Label(col, FkLocale.Format("total_stars", lang, TotalStars(), FkStages.Count * 3), 36, Mint, TextAnchor.MiddleCenter, new Vector2(0.1f, 0.44f), new Vector2(0.9f, 0.48f));

            int resume = 0;
            for (int i = 0; i < FkStages.Count; i++) if (IsUnlocked(i)) resume = i;
            bool started = bestStars[0] > 0;
            Btn(col, started ? L("continue") : L("play"), new Vector2(0.18f, 0.33f), new Vector2(0.82f, 0.4f), () => StartStage(resume), ButtonHot, 54);
            Btn(col, L("stages"), new Vector2(0.18f, 0.245f), new Vector2(0.82f, 0.31f), () => ShowPhase(Phase.Select), ButtonBg);
            Btn(col, FkLocale.LangNames[lang], new Vector2(0.18f, 0.16f), new Vector2(0.49f, 0.22f), CycleLanguage, ButtonBg, 40);
            Btn(col, muted ? L("sound_off") : L("sound_on"), new Vector2(0.51f, 0.16f), new Vector2(0.82f, 0.22f), ToggleMute, ButtonBg, 40);
            Label(col, L("controls"), 32, new Color(1f, 1f, 1f, 0.75f), TextAnchor.MiddleCenter, new Vector2(0.05f, 0.08f), new Vector2(0.95f, 0.13f));
            Label(col, "OIYO GAME", 28, new Color(1f, 1f, 1f, 0.5f), TextAnchor.MiddleCenter, new Vector2(0.1f, 0.03f), new Vector2(0.9f, 0.07f));
        }

        void BuildSelect()
        {
            selectPanel = Rt("Select", canvasRect, Vector2.zero, Vector2.one).gameObject;
            Box("Bg", selectPanel.transform, new Color(0.01f, 0.03f, 0.06f, 0.96f), Vector2.zero, Vector2.one, null, true);
            var col = Rt("Column", selectPanel.transform, new Vector2(0.5f, 0f), new Vector2(0.5f, 1f));
            col.sizeDelta = new Vector2(1040, 0);
            Label(col, L("stages"), 64, Gold, TextAnchor.MiddleCenter, new Vector2(0.05f, 0.89f), new Vector2(0.95f, 0.96f), true);
            Label(col, FkLocale.Format("total_stars", lang, TotalStars(), FkStages.Count * 3), 36, Mint, TextAnchor.MiddleCenter, new Vector2(0.1f, 0.85f), new Vector2(0.9f, 0.89f));
            for (int i = 0; i < FkStages.Count; i++)
            {
                int r = i / 3, c = i % 3;
                float x0 = 0.04f + c * 0.32f, y1 = 0.83f - r * 0.175f;
                int idx = i;
                bool open = IsUnlocked(i);
                var b = Btn(col, "", new Vector2(x0, y1 - 0.16f), new Vector2(x0 + 0.3f, y1), () =>
                {
                    if (IsUnlocked(idx)) StartStage(idx);
                    else ShowMessage(L("locked"));
                }, open ? (FkStages.Build(i).boss ? new Color(0.32f, 0.12f, 0.36f, 0.96f) : ButtonBg) : new Color(0.12f, 0.12f, 0.14f, 0.9f));
                var bt = b.transform;
                Label(bt, (i + 1).ToString(), 72, open ? Gold : new Color(0.5f, 0.5f, 0.5f), TextAnchor.MiddleCenter, new Vector2(0f, 0.5f), new Vector2(1f, 0.95f), true);
                Label(bt, open ? FkLocale.StageName(i, lang) : "?", 30, open ? Ivory : new Color(0.55f, 0.55f, 0.55f), TextAnchor.MiddleCenter, new Vector2(0.04f, 0.27f), new Vector2(0.96f, 0.52f));
                for (int s = 0; s < 3; s++)
                {
                    bool lit = bestStars[i] > s;
                    Box("Star", bt, lit ? Color.white : new Color(1f, 1f, 1f, 0.18f), new Vector2(0.2f + s * 0.21f, 0.05f), new Vector2(0.38f + s * 0.21f, 0.25f), sStar);
                }
            }
            Btn(col, L("back"), new Vector2(0.3f, 0.03f), new Vector2(0.7f, 0.09f), () => ShowPhase(Phase.Title), ButtonBg);
            msgText = Label(col, "", 38, Gold, TextAnchor.MiddleCenter, new Vector2(0.05f, 0.09f), new Vector2(0.95f, 0.13f), true);
        }

        void BuildHud()
        {
            hudPanel = Rt("Hud", uiRoot, Vector2.zero, Vector2.one).gameObject;
            var top = Box("TopBar", hudPanel.transform, new Color(0f, 0.02f, 0.05f, 0.72f), new Vector2(0f, 0.915f), new Vector2(1f, 1f)).transform;
            Btn(top, "II", new Vector2(0.015f, 0.14f), new Vector2(0.115f, 0.86f), () => SetPaused(true), ButtonBg, 44);
            for (int i = 0; i < 3; i++)
                hudHearts[i] = Box("Heart", top, Color.white, new Vector2(0.13f + i * 0.065f, 0.5f), new Vector2(0.19f + i * 0.065f, 0.92f), sHeart);
            Label(top, L("oil"), 26, Ivory, TextAnchor.MiddleLeft, new Vector2(0.13f, 0.08f), new Vector2(0.21f, 0.46f));
            Box("OilBack", top, new Color(1f, 1f, 1f, 0.15f), new Vector2(0.21f, 0.16f), new Vector2(0.44f, 0.38f));
            oilFill = Box("OilFill", top, Gold, new Vector2(0.21f, 0.16f), new Vector2(0.44f, 0.38f));
            oilFill.sprite = sWhite; oilFill.preserveAspect = false;
            oilFill.type = Image.Type.Filled; oilFill.fillMethod = Image.FillMethod.Horizontal; oilFill.fillAmount = 1f;
            hudStage = Label(top, "", 30, Mint, TextAnchor.MiddleCenter, new Vector2(0.45f, 0.5f), new Vector2(0.75f, 0.95f), true);
            hudTime = Label(top, "", 30, Ivory, TextAnchor.MiddleCenter, new Vector2(0.45f, 0.05f), new Vector2(0.75f, 0.5f));
            hudCountIcon = Box("CountIcon", top, Color.white, new Vector2(0.76f, 0.12f), new Vector2(0.84f, 0.88f), sLantern);
            hudCount = Label(top, "", 48, Gold, TextAnchor.MiddleLeft, new Vector2(0.845f, 0.05f), new Vector2(0.995f, 0.95f), true);

            bossBar = Rt("BossBar", hudPanel.transform, new Vector2(0.15f, 0.875f), new Vector2(0.85f, 0.905f)).gameObject;
            Box("BossBack", bossBar.transform, new Color(0f, 0f, 0f, 0.6f), Vector2.zero, Vector2.one);
            bossFill = Box("BossFill", bossBar.transform, new Color(0.7f, 0.3f, 0.9f), Vector2.zero, Vector2.one);
            bossFill.sprite = sWhite; bossFill.preserveAspect = false;
            bossFill.type = Image.Type.Filled; bossFill.fillMethod = Image.FillMethod.Horizontal;
            Label(bossBar.transform, L("boss"), 28, Ivory, TextAnchor.MiddleCenter, Vector2.zero, Vector2.one, true);

            var toast = Rt("Toast", hudPanel.transform, new Vector2(0.04f, 0.7f), new Vector2(0.96f, 0.86f));
            toastGroup = toast.gameObject.AddComponent<CanvasGroup>();
            toastGroup.blocksRaycasts = false; toastGroup.interactable = false;
            Box("ToastBg", toast, new Color(0f, 0.03f, 0.06f, 0.75f), Vector2.zero, Vector2.one);
            toastTitle = Label(toast, "", 54, Gold, TextAnchor.MiddleCenter, new Vector2(0.03f, 0.52f), new Vector2(0.97f, 0.96f), true);
            toastBody = Label(toast, "", 34, Ivory, TextAnchor.MiddleCenter, new Vector2(0.04f, 0.05f), new Vector2(0.96f, 0.52f));

            var msg = Label(hudPanel.transform, "", 40, Mint, TextAnchor.MiddleCenter, new Vector2(0.05f, 0.62f), new Vector2(0.95f, 0.68f), true);
            msg.name = "HudMsg";

            joyRing = Box("JoyRing", canvasRect, new Color(1f, 0.9f, 0.6f, 0.18f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), sGlow).rectTransform;
            joyRing.sizeDelta = new Vector2(260, 260);
            joyKnob = Box("JoyKnob", canvasRect, new Color(1f, 0.92f, 0.6f, 0.55f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), sGlow).rectTransform;
            joyKnob.sizeDelta = new Vector2(110, 110);
            joyRing.gameObject.SetActive(false); joyKnob.gameObject.SetActive(false);
        }

        Text HudMsg => hudPanel.transform.Find("HudMsg").GetComponent<Text>();

        void BuildPause()
        {
            pausePanel = Rt("Pause", canvasRect, Vector2.zero, Vector2.one).gameObject;
            Box("Veil", pausePanel.transform, new Color(0f, 0f, 0f, 0.6f), Vector2.zero, Vector2.one, null, true);
            var card = Box("Card", pausePanel.transform, PanelBg, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f)).rectTransform;
            card.sizeDelta = new Vector2(760, 900);
            Label(card, L("paused"), 64, Gold, TextAnchor.MiddleCenter, new Vector2(0.05f, 0.82f), new Vector2(0.95f, 0.96f), true);
            Btn(card, L("resume"), new Vector2(0.12f, 0.62f), new Vector2(0.88f, 0.76f), () => SetPaused(false), ButtonHot, 50);
            Btn(card, L("retry"), new Vector2(0.12f, 0.45f), new Vector2(0.88f, 0.59f), () => StartStage(stageIndex), ButtonBg);
            Btn(card, L("stages"), new Vector2(0.12f, 0.28f), new Vector2(0.88f, 0.42f), () => { ClearWorld(); ShowPhase(Phase.Select); }, ButtonBg);
            var mb = Btn(card, muted ? L("sound_off") : L("sound_on"), new Vector2(0.12f, 0.08f), new Vector2(0.88f, 0.22f), null, ButtonBg);
            var ml = mb.GetComponentInChildren<Text>();
            mb.onClick.AddListener(() => { ToggleMute(); ml.text = muted ? L("sound_off") : L("sound_on"); });
        }

        void BuildResult()
        {
            resultPanel = Rt("Result", canvasRect, Vector2.zero, Vector2.one).gameObject;
            Box("Veil", resultPanel.transform, new Color(0f, 0f, 0f, 0.55f), Vector2.zero, Vector2.one, null, true);
            var card = Box("Card", resultPanel.transform, PanelBg, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f)).rectTransform;
            card.sizeDelta = new Vector2(860, 1180);
            Box("Lantern", card, Color.white, new Vector2(0.38f, 0.8f), new Vector2(0.62f, 0.96f), sLantern);
            resultTitle = Label(card, "", 54, Gold, TextAnchor.MiddleCenter, new Vector2(0.04f, 0.69f), new Vector2(0.96f, 0.8f), true);
            for (int i = 0; i < 3; i++)
            {
                float y = 0.6f - i * 0.075f;
                resultStars[i] = Box("Star", card, Color.white, new Vector2(0.1f, y - 0.03f), new Vector2(0.2f, y + 0.035f), sStar);
                resultStarLabels[i] = Label(card, "", 36, Ivory, TextAnchor.MiddleLeft, new Vector2(0.23f, y - 0.035f), new Vector2(0.95f, y + 0.035f));
            }
            resultTime = Label(card, "", 36, Mint, TextAnchor.MiddleCenter, new Vector2(0.05f, 0.37f), new Vector2(0.95f, 0.43f));
            var nb = Btn(card, L("next"), new Vector2(0.1f, 0.24f), new Vector2(0.9f, 0.34f), NextFromResult, ButtonHot, 50);
            nextButton = nb.gameObject; nextLabel = nb.GetComponentInChildren<Text>();
            Btn(card, L("retry"), new Vector2(0.1f, 0.13f), new Vector2(0.49f, 0.22f), () => StartStage(stageIndex), ButtonBg);
            Btn(card, L("stages"), new Vector2(0.51f, 0.13f), new Vector2(0.9f, 0.22f), () => { ClearWorld(); ShowPhase(Phase.Select); }, ButtonBg);
            Btn(card, L("menu"), new Vector2(0.3f, 0.03f), new Vector2(0.7f, 0.11f), () => { ClearWorld(); ShowPhase(Phase.Title); }, ButtonBg, 38);
        }

        void BuildEnding()
        {
            endingPanel = Rt("Ending", canvasRect, Vector2.zero, Vector2.one).gameObject;
            var bg = Box("KeyArt", endingPanel.transform, new Color(1f, 0.95f, 0.8f), Vector2.zero, Vector2.one, sKey, true);
            bg.preserveAspect = false;
            var fit = bg.gameObject.AddComponent<AspectRatioFitter>();
            fit.aspectMode = AspectRatioFitter.AspectMode.EnvelopeParent; fit.aspectRatio = 16f / 9f;
            Box("Veil", endingPanel.transform, new Color(0f, 0.02f, 0.05f, 0.35f), Vector2.zero, Vector2.one);
            var col = Rt("Column", endingPanel.transform, new Vector2(0.5f, 0f), new Vector2(0.5f, 1f));
            col.sizeDelta = new Vector2(1000, 0);
            Box("Trophy", col, Color.white, new Vector2(0.3f, 0.6f), new Vector2(0.7f, 0.82f), sTrophy);
            Label(col, L("ending_title"), 62, Gold, TextAnchor.MiddleCenter, new Vector2(0.03f, 0.49f), new Vector2(0.97f, 0.59f), true);
            Label(col, L("ending_body"), 40, Ivory, TextAnchor.MiddleCenter, new Vector2(0.06f, 0.37f), new Vector2(0.94f, 0.49f));
            Label(col, FkLocale.Format("total_stars", lang, TotalStars(), FkStages.Count * 3), 40, Mint, TextAnchor.MiddleCenter, new Vector2(0.1f, 0.31f), new Vector2(0.9f, 0.36f));
            Btn(col, L("stages"), new Vector2(0.2f, 0.19f), new Vector2(0.8f, 0.26f), () => ShowPhase(Phase.Select), ButtonHot);
            Btn(col, L("menu"), new Vector2(0.2f, 0.1f), new Vector2(0.8f, 0.17f), () => ShowPhase(Phase.Title), ButtonBg);
        }

        void ShowPhase(Phase p)
        {
            // Rebuild menus so stars / labels are always fresh.
            if (p == Phase.Title || p == Phase.Select || p == Phase.Ending) BuildUI();
            phase = p;
            titlePanel.SetActive(p == Phase.Title);
            selectPanel.SetActive(p == Phase.Select);
            hudPanel.SetActive(p == Phase.Play || p == Phase.Paused || p == Phase.Result);
            pausePanel.SetActive(p == Phase.Paused);
            resultPanel.SetActive(p == Phase.Result);
            endingPanel.SetActive(p == Phase.Ending);
            if (p == Phase.Paused || p == Phase.Result) RefreshHud();
            dragging = false;
            if (joyRing != null) { joyRing.gameObject.SetActive(false); joyKnob.gameObject.SetActive(false); }
        }

        void ShowMessage(string s)
        {
            if (phase == Phase.Select && msgText != null) { msgText.text = s; msgTimer = 2.2f; return; }
            if (hudPanel != null) { HudMsg.text = s; msgTimer = 2.2f; }
        }

        void CycleLanguage()
        {
            lang = (lang + 1) % FkLocale.Langs;
            WriteSave();
            ShowPhase(Phase.Title);
        }

        void ToggleMute()
        {
            muted = !muted;
            ApplyMute();
            WriteSave();
            if (phase == Phase.Title) ShowPhase(Phase.Title);
        }

        void SetPaused(bool on)
        {
            if (on && phase == Phase.Play) ShowPhase(Phase.Paused);
            else if (!on && phase == Phase.Paused)
            {
                phase = Phase.Play;
                pausePanel.SetActive(false);
                hudPanel.SetActive(true);
                RefreshHud();
            }
        }

        void NextFromResult()
        {
            if (!cleared) { StartStage(stageIndex); return; }
            if (stageIndex + 1 < FkStages.Count) StartStage(stageIndex + 1);
            else { ClearWorld(); ShowPhase(Phase.Ending); }
        }

        // =====================================================================
        // Stage building
        // =====================================================================
        void ClearWorld()
        {
            if (world != null) Destroy(world.gameObject);
            world = null;
            flies.Clear(); chain.Clear(); enemies.Clear(); shrines.Clear(); gates.Clear(); winds.Clear(); dews.Clear(); sparks.Clear(); beams.Clear();
            bossT = null;
        }

        SpriteRenderer Spr(string name, Transform parent, Sprite s, Vector2 pos, float size, Color c, int order)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = new Vector3(pos.x, pos.y, 0f);
            go.transform.localScale = new Vector3(size, size, 1f);
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = s; sr.color = c; sr.sortingOrder = order;
            return sr;
        }

        void StartStage(int index)
        {
            ClearWorld();
            stageIndex = index;
            def = FkStages.Build(index);
            world = new GameObject("World").transform;

            float dark = def.darkness;
            Spr("Backdrop", world, sKey, new Vector2(0f, 0.6f), 40f, new Color(0.32f, 0.4f, 0.48f) * (1f - dark * 0.6f), -100);
            var floor = Spr("Floor", world, sWhite, Vector2.zero, 1f, new Color(0.02f, 0.06f, 0.08f, 0.55f + dark * 0.3f), -90);
            floor.transform.localScale = new Vector3(FkStages.HalfW * 2f + 0.3f, FkStages.HalfH * 2f + 0.3f, 1f);
            var rim = Spr("Rim", world, sWhite, Vector2.zero, 1f, new Color(0.55f, 0.9f, 0.7f, 0.12f), -91);
            rim.transform.localScale = new Vector3(FkStages.HalfW * 2f + 0.5f, FkStages.HalfH * 2f + 0.5f, 1f);

            // ambient motes for life
            var rng = new System.Random(index * 97 + 13);
            for (int i = 0; i < 26; i++)
            {
                var m = Spr("Mote", world, sGlow, new Vector2((float)rng.NextDouble() * 9f - 4.5f, (float)rng.NextDouble() * 15f - 7.5f), 0.12f + (float)rng.NextDouble() * 0.1f, new Color(0.6f, 1f, 0.8f, 0.25f), -60);
                m.gameObject.name = "Mote" + i;
            }

            foreach (var r in def.walls)
            {
                var w = Spr("Wall", world, sStone, r.center, 1f, Color.Lerp(new Color(0.8f, 0.85f, 0.9f), new Color(0.35f, 0.38f, 0.45f), dark), -10);
                w.drawMode = SpriteDrawMode.Tiled; w.tileMode = SpriteTileMode.Continuous;
                w.size = r.size;
            }
            foreach (var gd in def.gates)
            {
                var sr = Spr("Gate", world, sWhite, gd.rect.center, 1f, new Color(1f, 0.75f, 0.3f, 0.85f), -9);
                sr.transform.localScale = new Vector3(gd.rect.width, gd.rect.height, 1f);
                var icon = Spr("GateCharm", sr.transform, sTalisman, Vector2.zero, 1f, Color.white, -8);
                float s = Mathf.Min(gd.rect.width, gd.rect.height) * 1.4f;
                icon.transform.localScale = new Vector3(s / gd.rect.width, s / gd.rect.height, 1f);
                gates.Add(new Gate { sr = sr, rect = gd.rect, sw = gd.switchIndex });
            }
            foreach (var wd in def.winds)
            {
                var wind = new Wind { rect = wd.rect, force = wd.force };
                var zone = Spr("WindZone", world, sWhite, wd.rect.center, 1f, new Color(0.6f, 0.85f, 1f, 0.06f), -55);
                zone.transform.localScale = new Vector3(wd.rect.width, wd.rect.height, 1f);
                var compass = Spr("WindCompass", world, sCompass, wd.rect.center, 0.7f, new Color(1f, 1f, 1f, 0.55f), -54);
                compass.transform.localRotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(wd.force.y, wd.force.x) * Mathf.Rad2Deg - 90f);
                int n = Mathf.Clamp(Mathf.RoundToInt(wd.rect.width * wd.rect.height * 0.9f), 6, 16);
                for (int i = 0; i < n; i++)
                {
                    var mote = Spr("WindMote", world, sWhite, new Vector2(wd.rect.x + (float)rng.NextDouble() * wd.rect.width, wd.rect.y + (float)rng.NextDouble() * wd.rect.height), 1f, new Color(0.8f, 0.95f, 1f, 0.35f), -53);
                    float ang = Mathf.Atan2(wd.force.y, wd.force.x) * Mathf.Rad2Deg;
                    mote.transform.localRotation = Quaternion.Euler(0f, 0f, ang);
                    mote.transform.localScale = new Vector3(0.45f, 0.04f, 1f);
                    wind.motes.Add(mote.transform);
                }
                winds.Add(wind);
            }

            if (!def.boss) AddShrine(def.goal, def.quota, true, -1);
            for (int i = 0; i < def.switches.Count; i++) AddShrine(def.switches[i].pos, def.switches[i].need, false, i);

            foreach (var p in def.dews)
            {
                var sr = Spr("Dew", world, sDew, p, 0.55f, Color.white, 2);
                dews.Add(new Dew { t = sr.transform, sr = sr, pos = p });
            }

            for (int i = 0; i < def.flies.Count; i++) AddFly(def.flies[i], def.allSkittish || def.skittish.Contains(i), rng);

            foreach (var ed in def.enemies) AddEnemy(ed, ed.path[0]);

            if (def.boss)
            {
                bossPos = new Vector2(0f, 0.6f);
                var b = Spr("Shade", world, sGlow, bossPos, 3.4f, new Color(0.08f, 0.02f, 0.14f, 0.95f), 13);
                bossT = b.transform; bossSr = b;
                Spr("ShadeHalo", bossT, sGlow, Vector2.zero, 1.3f, new Color(0.45f, 0.1f, 0.6f, 0.35f), 12);
                bossEye = Spr("ShadeEye", bossT, sDim, Vector2.zero, 0.3f, new Color(1f, 0.3f, 0.45f), 14);
                bossHp = 3; bossAngle = -Mathf.PI / 2f; bossDashTimer = 4f; bossDashLeft = 0f; minionTimer = 8f; bossFlash = 0f;
            }

            pPos = def.start; pVel = Vector2.zero;
            playerGlow = Spr("PlayerGlow", world, sGlow, pPos, 3f, new Color(1f, 0.85f, 0.45f, 0.28f), 4);
            playerSr = Spr("Player", world, sLantern, pPos, 0.9f, Color.white, 15);
            playerT = playerSr.transform;

            hearts = 3; oil = 100f; elapsed = 0f; invuln = 0f; dropCd = 0f; delivered = 0; noHit = true; ending = false; endTimer = 0f; cleared = false; failKey = null;
            shake = 0f;

            ShowPhase(Phase.Play);
            bossBar.SetActive(def.boss);
            toastTitle.text = FkLocale.Format("night", lang, index + 1) + " · " + FkLocale.StageName(index, lang);
            toastBody.text = FkLocale.StageHint(index, lang);
            toastTimer = 4.2f;
            if (index == 0) ShowMessage(L("controls"));
            RefreshHud();
        }

        void AddShrine(Vector2 pos, int need, bool goal, int index)
        {
            var glow = Spr("ShrineGlow", world, sGlow, pos, 2.6f, goal ? new Color(1f, 0.8f, 0.4f, 0.12f) : new Color(1f, 0.4f, 0.35f, 0.12f), -1);
            var sr = Spr(goal ? "Goal" : "Charm", world, goal ? sLantern : sTalisman, pos, goal ? 1.5f : 1.05f, Color.white, 0);
            var lgo = new GameObject("Count");
            lgo.transform.SetParent(sr.transform, false);
            lgo.transform.localPosition = new Vector3(0f, goal ? -0.62f : -0.75f, 0f);
            var tm = lgo.AddComponent<TextMesh>();
            tm.font = fontKo; tm.fontSize = 64; tm.characterSize = goal ? 0.05f : 0.07f; tm.anchor = TextAnchor.MiddleCenter; tm.alignment = TextAlignment.Center;
            tm.color = goal ? Gold : Ivory;
            var mr = lgo.GetComponent<MeshRenderer>();
            mr.sharedMaterial = fontKo.material; mr.sortingOrder = 30;
            var s = new Shrine { t = sr.transform, sr = sr, glow = glow, label = tm, pos = pos, need = need, isGoal = goal, index = index };
            shrines.Add(s);
            UpdateShrineLabel(s);
        }

        void UpdateShrineLabel(Shrine s)
        {
            if (s.isGoal) s.label.text = delivered + "/" + s.need;
            else s.label.text = s.done ? "" : (s.have + "/" + s.need);
        }

        void AddFly(Vector2 p, bool skittish, System.Random rng)
        {
            var glow = Spr("FlyGlow", world, sGlow, p, 0.9f, new Color(0.7f, 1f, 0.6f, 0.0f), 5);
            var sr = Spr("Firefly", world, sDim, p, 0.42f, Color.white, 10);
            flies.Add(new Fly { t = sr.transform, sr = sr, glow = glow, home = p, pos = p, skittish = skittish, phase = (float)rng.NextDouble() * 6.28f });
        }

        void AddEnemy(EnemyDef ed, Vector2 at)
        {
            var body = Spr("Shadow", world, sGlow, at, 1.35f, new Color(0.1f, 0.02f, 0.16f, 0.9f), 12);
            var eye = Spr("ShadowEye", body.transform, sDim, Vector2.zero, 0.26f, new Color(1f, 0.35f, 0.5f), 13);
            enemies.Add(new Enemy { t = body.transform, body = body, eye = eye, def = ed, pos = at, pathIdx = ed.path.Length > 1 ? 1 : 0, phase = UnityEngine.Random.value * 6f });
        }

        // =====================================================================
        // Loop
        // =====================================================================
        void Update()
        {
            FitCamera();
            UpdateScaler();
            float dt = Mathf.Min(Time.deltaTime, 0.05f);

            if (msgTimer > 0f)
            {
                msgTimer -= Time.deltaTime;
                if (msgTimer <= 0f)
                {
                    if (msgText != null) msgText.text = "";
                    if (hudPanel != null) HudMsg.text = "";
                }
            }

            if (phase == Phase.Play)
            {
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { SetPaused(true); return; }
                Tick(dt);
            }
            else if (phase == Phase.Paused && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)))
            {
                SetPaused(false);
            }

            if (world != null && phase != Phase.Paused) Animate(dt);

            shake = Mathf.Max(0f, shake - dt * 2.5f);
            Vector2 off = shake > 0f ? UnityEngine.Random.insideUnitCircle * shake * 0.35f : Vector2.zero;
            cam.transform.position = camBase + new Vector3(off.x, off.y, 0f);
        }

        float LightRadius => (1.5f + 0.13f * Mathf.Min(chain.Count, 10)) * (oil < 15f ? 0.75f : 1f);

        void Tick(float dt)
        {
            elapsed += dt;
            if (toastTimer > 0f)
            {
                toastTimer -= dt;
                toastGroup.alpha = Mathf.Clamp01(toastTimer / 0.6f);
            }

            if (ending)
            {
                endTimer -= dt;
                if (endTimer <= 0f) FinishStage();
                return;
            }

            oil -= def.oilDrain * dt;
            invuln = Mathf.Max(0f, invuln - dt);
            dropCd = Mathf.Max(0f, dropCd - dt);

            MovePlayer(dt);
            UpdateFlies(dt);
            UpdateEnemies(dt);
            if (def.boss) UpdateBoss(dt);
            UpdateShrines(dt);
            UpdateDews(dt);

            if (oil <= 0f) { oil = 0f; Fail("fail_oil"); }
            else if (hearts <= 0) Fail("fail_heart");
            RefreshHud();
        }

        void MovePlayer(float dt)
        {
            Vector2 input = Vector2.zero;
            if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) input.x -= 1f;
            if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) input.x += 1f;
            if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) input.y -= 1f;
            if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) input.y += 1f;
            if (input.sqrMagnitude > 1f) input.Normalize();
            if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift)) input *= 0.38f;

            // virtual joystick anywhere on screen
            bool down = false, began = false; Vector2 sp = Vector2.zero; int finger = -1;
            if (Input.touchCount > 0)
            {
                var t = Input.GetTouch(0);
                sp = t.position; finger = t.fingerId;
                down = t.phase != TouchPhase.Ended && t.phase != TouchPhase.Canceled;
                began = t.phase == TouchPhase.Began;
            }
            else if (Input.GetMouseButton(0))
            {
                down = true; sp = Input.mousePosition; began = Input.GetMouseButtonDown(0);
            }
            if (began)
            {
                bool overUi = EventSystem.current != null && (finger >= 0 ? EventSystem.current.IsPointerOverGameObject(finger) : EventSystem.current.IsPointerOverGameObject());
                if (!overUi) { dragging = true; dragAnchor = sp; }
            }
            if (!down) dragging = false;
            float joyR = Mathf.Min(Screen.width, Screen.height) * 0.11f;
            if (dragging)
            {
                dragCurrent = sp;
                Vector2 v = (dragCurrent - dragAnchor) / joyR;
                if (v.magnitude > 1f) { dragAnchor = dragCurrent - v.normalized * joyR; v = v.normalized; }
                if (v.magnitude > 0.12f) input = v;
            }
            joyRing.gameObject.SetActive(dragging); joyKnob.gameObject.SetActive(dragging);
            if (dragging)
            {
                joyRing.position = dragAnchor;
                joyKnob.position = dragCurrent;
                float scale = canvas.scaleFactor;
                joyRing.sizeDelta = Vector2.one * (joyR * 2.4f / Mathf.Max(0.01f, scale));
            }

            Vector2 desired = input * MaxSpeed;
            pVel = Vector2.MoveTowards(pVel, desired, 26f * dt);
            Vector2 wind = WindAt(pPos);
            pPos += (pVel + wind) * dt;
            pPos = Collide(pPos, PlayerRadius);
            pPos.x = Mathf.Clamp(pPos.x, -FkStages.HalfW + PlayerRadius, FkStages.HalfW - PlayerRadius);
            pPos.y = Mathf.Clamp(pPos.y, -FkStages.HalfH + PlayerRadius, FkStages.HalfH - PlayerRadius);
        }

        Vector2 WindAt(Vector2 p)
        {
            Vector2 f = Vector2.zero;
            foreach (var w in winds) if (w.rect.Contains(p)) f += w.force;
            return f;
        }

        Vector2 Collide(Vector2 p, float r)
        {
            foreach (var rect in def.walls) p = PushOut(p, r, rect);
            foreach (var g in gates) if (!g.open) p = PushOut(p, r, g.rect);
            return p;
        }

        static Vector2 PushOut(Vector2 p, float r, Rect rect)
        {
            Vector2 cp = new Vector2(Mathf.Clamp(p.x, rect.xMin, rect.xMax), Mathf.Clamp(p.y, rect.yMin, rect.yMax));
            Vector2 d = p - cp;
            float sq = d.sqrMagnitude;
            if (sq >= r * r) return p;
            if (sq > 1e-6f) return cp + d / Mathf.Sqrt(sq) * r;
            // centre inside: leave through the nearest side
            float left = p.x - rect.xMin, right = rect.xMax - p.x, bottom = p.y - rect.yMin, top = rect.yMax - p.y;
            float m = Mathf.Min(Mathf.Min(left, right), Mathf.Min(bottom, top));
            if (m == left) return new Vector2(rect.xMin - r, p.y);
            if (m == right) return new Vector2(rect.xMax + r, p.y);
            if (m == bottom) return new Vector2(p.x, rect.yMin - r);
            return new Vector2(p.x, rect.yMax + r);
        }

        void UpdateFlies(float dt)
        {
            float speed = pVel.magnitude;
            float catchR = 0.95f;
            for (int i = 0; i < flies.Count; i++)
            {
                var f = flies[i];
                f.phase += dt;
                switch (f.state)
                {
                    case 0:
                    {
                        Vector2 bob = new Vector2(Mathf.Sin(f.phase * 1.3f), Mathf.Cos(f.phase * 1.7f)) * 0.18f;
                        float d = Vector2.Distance(f.pos, pPos);
                        if (f.skittish && speed > 2.3f && d < 2.4f)
                        {
                            Vector2 away = (f.pos - pPos).normalized;
                            f.pos += away * 3.3f * dt;
                            f.pos = Collide(f.pos, 0.2f);
                            f.pos.x = Mathf.Clamp(f.pos.x, -FkStages.HalfW + 0.3f, FkStages.HalfW - 0.3f);
                            f.pos.y = Mathf.Clamp(f.pos.y, -FkStages.HalfH + 0.3f, FkStages.HalfH - 0.3f);
                        }
                        else
                        {
                            f.pos = Vector2.Lerp(f.pos, f.home + bob, 1.2f * dt);
                            if (d < catchR && (!f.skittish || speed <= 2.3f)) Catch(f);
                        }
                        break;
                    }
                    case 1:
                        break; // chain handled below
                    case 2:
                        if (def.boss)
                        {
                            f.timer -= dt;
                            if (f.timer <= 0f) { f.state = 0; f.pos = f.home; f.sr.enabled = true; f.glow.enabled = true; Burst(f.pos, Mint, 6, 1.4f); }
                        }
                        break;
                    case 3:
                        f.timer -= dt;
                        f.pos += f.vel * dt;
                        f.vel *= Mathf.Exp(-3f * dt);
                        if (f.timer <= 0f) f.state = 0;
                        break;
                    case 4:
                    {
                        Vector2 to = f.target.pos - f.pos;
                        float step = 10f * dt;
                        if (to.magnitude <= step) Arrive(f);
                        else f.pos += to.normalized * step;
                        break;
                    }
                }
            }

            // chain follows the lantern like a ribbon
            Vector2 lead = pPos;
            for (int i = 0; i < chain.Count; i++)
            {
                var f = chain[i];
                Vector2 to = f.pos - lead;
                float d = to.magnitude;
                float gap = i == 0 ? Spacing + 0.15f : Spacing;
                if (d > gap) f.pos = Vector2.Lerp(f.pos, lead + to / d * gap, Mathf.Min(1f, 14f * dt));
                f.pos += WindAt(f.pos) * dt * 0.35f;
                lead = f.pos;
            }
        }

        void Catch(Fly f)
        {
            f.state = 1;
            chain.Add(f);
            Play(cPick, 0.7f);
            Burst(f.pos, Mint, 8, 1.6f);
            if (stageIndex == 0 && delivered == 0 && chain.Count == 1) ShowMessage(L("hint_drop"));
        }

        void CutChain(int from, Vector2 source)
        {
            if (from < 0 || from >= chain.Count) return;
            for (int i = chain.Count - 1; i >= from; i--)
            {
                var f = chain[i];
                f.state = 3; f.timer = 2.2f;
                Vector2 away = (f.pos - source);
                if (away.sqrMagnitude < 0.001f) away = UnityEngine.Random.insideUnitCircle;
                f.vel = away.normalized * 3.2f + UnityEngine.Random.insideUnitCircle * 1.2f;
                chain.RemoveAt(i);
                Burst(f.pos, new Color(0.6f, 0.4f, 1f), 4, 1.2f);
            }
        }

        void UpdateEnemies(float dt)
        {
            float lr = LightRadius;
            foreach (var e in enemies)
            {
                e.phase += dt;
                var d = e.def;
                if (d.kind == EnemyKind.Patrol)
                {
                    Vector2 target = d.path[e.pathIdx];
                    Vector2 to = target - e.pos;
                    float step = d.speed * dt;
                    if (to.magnitude <= step) { e.pos = target; e.pathIdx = (e.pathIdx + 1) % d.path.Length; }
                    else e.pos += to.normalized * step;
                }
                else
                {
                    float dist = Vector2.Distance(e.pos, pPos);
                    Vector2 desired;
                    if (dist < d.chaseRange)
                    {
                        Vector2 dir = (pPos - e.pos).normalized;
                        desired = lr >= d.fear ? -dir * d.speed * 1.15f : dir * d.speed;
                    }
                    else
                    {
                        Vector2 home = d.path[0] + new Vector2(Mathf.Sin(e.phase * 0.7f), Mathf.Cos(e.phase * 0.5f)) * 0.8f;
                        desired = (home - e.pos) * 0.8f;
                    }
                    e.vel = Vector2.MoveTowards(e.vel, desired, 6f * dt);
                    e.pos += e.vel * dt;
                    e.pos = Collide(e.pos, 0.4f);
                    e.pos.x = Mathf.Clamp(e.pos.x, -FkStages.HalfW + 0.4f, FkStages.HalfW - 0.4f);
                    e.pos.y = Mathf.Clamp(e.pos.y, -FkStages.HalfH + 0.4f, FkStages.HalfH - 0.4f);
                }
                HitTest(e.pos, 0.55f, 0.5f);
            }
        }

        /// <summary>Shadow at pos touches the trail or the lantern.</summary>
        void HitTest(Vector2 pos, float playerR, float flyR)
        {
            for (int i = 0; i < chain.Count; i++)
            {
                if (Vector2.Distance(chain[i].pos, pos) < flyR)
                {
                    CutChain(i, pos);
                    Play(cHit, 0.45f);
                    shake = Mathf.Max(shake, 0.4f);
                    break;
                }
            }
            if (invuln <= 0f && Vector2.Distance(pPos, pos) < playerR + PlayerRadius * 0.5f)
            {
                hearts--; noHit = false; invuln = 1.6f;
                CutChain(chain.Count / 2, pos);
                Vector2 away = (pPos - pos); if (away.sqrMagnitude < 0.001f) away = Vector2.down;
                pVel = away.normalized * 7f;
                Play(cHit, 1f);
                shake = 1f;
                Burst(pPos, new Color(1f, 0.4f, 0.4f), 14, 2.4f);
            }
        }

        void UpdateBoss(float dt)
        {
            int lost = 3 - bossHp;
            float sp = 0.55f + 0.22f * lost;
            bossFlash = Mathf.Max(0f, bossFlash - dt);
            if (bossDashLeft > 0f)
            {
                bossDashLeft -= dt;
                bossPos += bossDashDir * (6.2f + lost) * dt;
                bossPos.x = Mathf.Clamp(bossPos.x, -FkStages.HalfW + 0.9f, FkStages.HalfW - 0.9f);
                bossPos.y = Mathf.Clamp(bossPos.y, -FkStages.HalfH + 0.9f, FkStages.HalfH - 0.9f);
            }
            else
            {
                bossAngle += sp * dt;
                Vector2 orbit = new Vector2(Mathf.Cos(bossAngle) * 2.7f, 0.6f + Mathf.Sin(bossAngle) * 3.3f);
                bossPos = Vector2.Lerp(bossPos, orbit, 2.2f * dt);
                bossDashTimer -= dt;
                if (bossDashTimer <= 0f)
                {
                    bossDashTimer = Mathf.Max(2.6f, 5.5f - lost * 1.1f);
                    bossDashLeft = 0.75f;
                    bossDashDir = (pPos - bossPos).normalized;
                    Burst(bossPos, new Color(0.6f, 0.2f, 0.8f), 10, 2f);
                }
            }
            minionTimer -= dt;
            if (minionTimer <= 0f)
            {
                minionTimer = 11f - lost * 2f;
                int chasers = 0;
                foreach (var e in enemies) if (e.def.kind == EnemyKind.Chaser) chasers++;
                if (chasers < 1 + lost)
                {
                    var ed = new EnemyDef { kind = EnemyKind.Chaser, path = new[] { bossPos }, speed = 1.7f + 0.15f * lost, chaseRange = 3.4f, fear = 2.3f };
                    AddEnemy(ed, bossPos);
                }
            }
            HitTest(bossPos, 1.05f, 1.05f);
        }

        void UpdateShrines(float dt)
        {
            foreach (var s in shrines)
            {
                s.pulse += dt;
                if (s.done) continue;
                if (chain.Count == 0 || dropCd > 0f) continue;
                if (Vector2.Distance(pPos, s.pos) > 1.2f) continue;
                if (!s.isGoal && s.have + s.pending >= s.need) continue;
                var f = chain[chain.Count - 1];
                chain.RemoveAt(chain.Count - 1);
                f.state = 4; f.target = s; s.pending++;
                dropCd = 0.13f;
            }
        }

        void Arrive(Fly f)
        {
            var s = f.target;
            s.pending = Mathf.Max(0, s.pending - 1);
            s.have++;
            f.state = 2; f.timer = 6f;
            f.sr.enabled = false; f.glow.enabled = false;
            f.pos = s.pos;
            Burst(s.pos, Gold, 8, 1.8f);
            Play(cDrop, 0.7f);
            if (s.isGoal)
            {
                delivered = s.have;
                if (delivered >= def.quota && !ending)
                {
                    ending = true; cleared = true; endTimer = 1.1f;
                    Burst(s.pos, Gold, 30, 3.2f);
                    Play(cClear, 0.9f);
                }
            }
            else if (s.have >= s.need)
            {
                if (def.boss) FireBeam(s);
                else
                {
                    s.done = true;
                    foreach (var g in gates) if (g.sw == s.index) g.open = true;
                    Play(cGate, 0.9f);
                    ShowMessage(L("gate_open"));
                    shake = Mathf.Max(shake, 0.5f);
                    Burst(s.pos, new Color(1f, 0.5f, 0.4f), 20, 2.6f);
                }
            }
            UpdateShrineLabel(s);
        }

        void FireBeam(Shrine s)
        {
            s.have = 0;
            var b = Spr("Beam", world, sWhite, Vector2.zero, 1f, new Color(1f, 0.92f, 0.6f, 0.9f), 25);
            Vector2 from = s.pos, to = bossPos;
            Vector2 mid = (from + to) * 0.5f;
            b.transform.localPosition = new Vector3(mid.x, mid.y, 0f);
            b.transform.localScale = new Vector3(Vector2.Distance(from, to), 0.35f, 1f);
            b.transform.localRotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(to.y - from.y, to.x - from.x) * Mathf.Rad2Deg);
            beams.Add(new Beam { t = b.transform, sr = b, life = 0.7f });
            bossHp--; bossFlash = 0.6f;
            Play(cBeam, 1f);
            shake = 1.2f;
            Burst(bossPos, Gold, 30, 3.6f);
            ShowMessage(L("beam"));
            if (bossHp <= 0 && !ending)
            {
                ending = true; cleared = true; endTimer = 1.6f;
                Play(cClear, 1f);
                for (int i = enemies.Count - 1; i >= 0; i--) { Burst(enemies[i].pos, Mint, 10, 2f); Destroy(enemies[i].t.gameObject); }
                enemies.Clear();
            }
        }

        void UpdateDews(float dt)
        {
            foreach (var d in dews)
            {
                if (d.taken)
                {
                    if (def.boss)
                    {
                        d.respawn -= dt;
                        if (d.respawn <= 0f) { d.taken = false; d.sr.enabled = true; }
                    }
                    continue;
                }
                if (Vector2.Distance(d.pos, pPos) < 0.7f)
                {
                    d.taken = true; d.sr.enabled = false; d.respawn = 14f;
                    oil = Mathf.Min(100f, oil + 35f);
                    Play(cDew, 0.8f);
                    Burst(d.pos, new Color(0.5f, 0.8f, 1f), 10, 2f);
                }
            }
        }

        void Fail(string key)
        {
            if (ending) return;
            ending = true; cleared = false; failKey = key; endTimer = 1f;
            Play(cFail, 0.9f);
            shake = 0.8f;
        }

        void FinishStage()
        {
            ending = false;
            int stars = FkStages.Stars(cleared, noHit, elapsed, def.par);
            if (cleared)
            {
                if (stars > bestStars[stageIndex]) bestStars[stageIndex] = stars;
                if (bestTime[stageIndex] <= 0f || elapsed < bestTime[stageIndex]) bestTime[stageIndex] = elapsed;
                WriteSave();
            }
            ReportResult(cleared, stars);
            ShowPhase(Phase.Result);
            resultTitle.text = cleared ? L("clear") : L(failKey ?? "fail_heart");
            bool[] got = { cleared, cleared && noHit, cleared && elapsed <= def.par };
            string[] labels = { L("star_clear"), L("star_nohit"), FkLocale.Format("star_par", lang, Mathf.RoundToInt(def.par)) };
            for (int i = 0; i < 3; i++)
            {
                resultStars[i].color = got[i] ? Color.white : new Color(1f, 1f, 1f, 0.18f);
                resultStarLabels[i].text = labels[i];
                resultStarLabels[i].color = got[i] ? Ivory : new Color(1f, 1f, 1f, 0.45f);
            }
            string t = FkLocale.Format("time", lang, elapsed.ToString("0.0"));
            if (bestTime[stageIndex] > 0f) t += "   " + FkLocale.Format("best", lang, bestTime[stageIndex].ToString("0.0"));
            resultTime.text = t;
            nextButton.SetActive(true);
            nextLabel.text = cleared ? (stageIndex + 1 < FkStages.Count ? L("next") : L("ending_title")) : L("retry");
        }

#if UNITY_WEBGL && !UNITY_EDITOR
        [System.Runtime.InteropServices.DllImport("__Internal")]
        static extern void OiyoPostResult(string slug, string outcome, int score);
#endif

        // Run result for the embedding OIYO page (Plugins/WebGL/OiyoResult.jslib).
        // score = stars earned on this run (0-3; 0 on a loss).
        void ReportResult(bool won, int stars)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            try { OiyoPostResult("firefly-keeper", won ? "win" : "loss", won ? stars : 0); }
            catch (Exception) { }
#endif
        }

        // =====================================================================
        // Visuals
        // =====================================================================
        float Visibility(Vector2 p)
        {
            float ambient = Mathf.Lerp(0.3f, 0.05f, def.darkness);
            float r = LightRadius;
            float best = 1f - Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(r * 0.55f, r * 1.25f, Vector2.Distance(p, pPos)));
            foreach (var f in chain)
            {
                float v = 1f - Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.4f, 1.15f, Vector2.Distance(p, f.pos)));
                if (v > best) best = v;
            }
            foreach (var s in shrines)
            {
                if (s.have <= 0) continue;
                float rr = 1f + 0.12f * s.have;
                float v = 1f - Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(rr * 0.5f, rr * 1.3f, Vector2.Distance(p, s.pos)));
                if (v > best) best = v;
            }
            return Mathf.Max(ambient, best);
        }

        void Animate(float dt)
        {
            float time = Time.time;
            // player
            if (playerT != null)
            {
                playerT.localPosition = new Vector3(pPos.x, pPos.y + Mathf.Sin(time * 3f) * 0.05f, 0f);
                float flicker = oil < 15f ? 0.75f + 0.25f * Mathf.PerlinNoise(time * 8f, 0f) : 1f;
                float r = LightRadius;
                playerGlow.transform.localPosition = new Vector3(pPos.x, pPos.y, 0f);
                playerGlow.transform.localScale = Vector3.one * r * 2.4f * flicker;
                playerGlow.color = new Color(1f, 0.85f, 0.45f, 0.26f * flicker);
                bool blink = invuln > 0f && Mathf.Repeat(time * 12f, 1f) < 0.5f;
                playerSr.color = blink ? new Color(1f, 1f, 1f, 0.35f) : Color.white;
                float tilt = Mathf.Clamp(-pVel.x * 3f, -14f, 14f);
                playerT.localRotation = Quaternion.Euler(0f, 0f, tilt);
            }

            foreach (var f in flies)
            {
                if (f.state == 2) continue;
                f.t.localPosition = new Vector3(f.pos.x, f.pos.y, 0f);
                f.glow.transform.localPosition = f.t.localPosition;
                bool lit = f.state == 1 || f.state == 4;
                f.sr.sprite = lit ? sLit : sDim;
                float tw = 0.5f + 0.5f * Mathf.Sin(f.phase * 4f);
                if (lit)
                {
                    f.sr.color = Color.white;
                    f.t.localScale = Vector3.one * (0.42f + tw * 0.05f);
                    f.glow.color = new Color(0.85f, 1f, 0.55f, 0.38f + tw * 0.12f);
                    f.glow.transform.localScale = Vector3.one * 1.3f;
                }
                else
                {
                    float vis = Visibility(f.pos);
                    float a = f.state == 3 ? 0.35f : Mathf.Max(0.45f, vis);
                    Color baseC = f.skittish ? new Color(0.8f, 0.95f, 1f) : Color.white;
                    f.sr.color = new Color(baseC.r, baseC.g, baseC.b, a);
                    f.t.localScale = Vector3.one * 0.4f;
                    f.glow.color = new Color(0.6f, 1f, 0.6f, (0.1f + tw * 0.18f) * (f.state == 3 ? 0.2f : 1f));
                    f.glow.transform.localScale = Vector3.one * 0.9f;
                }
            }

            foreach (var e in enemies)
            {
                float vis = Visibility(e.pos);
                float wob = 1f + Mathf.Sin(e.phase * 5f) * 0.06f;
                e.t.localPosition = new Vector3(e.pos.x, e.pos.y, 0f);
                e.t.localScale = Vector3.one * 1.35f * wob;
                e.body.color = new Color(ShadowCol.r, ShadowCol.g, ShadowCol.b, 0.95f * vis);
                e.eye.color = new Color(1f, 0.35f, 0.5f, Mathf.Clamp01(vis * 1.3f));
            }

            if (bossT != null)
            {
                bossT.localPosition = new Vector3(bossPos.x, bossPos.y, 0f);
                float s = 3.4f * (0.75f + 0.25f * bossHp / 3f) * (1f + Mathf.Sin(time * 2.4f) * 0.04f);
                bossT.localScale = Vector3.one * s;
                float vis = Mathf.Max(0.55f, Visibility(bossPos));
                bossSr.color = bossFlash > 0f ? new Color(1f, 0.9f, 0.6f, 0.95f) : new Color(0.08f, 0.02f, 0.14f, 0.95f * vis);
                bossEye.transform.localPosition = (Vector3)((pPos - bossPos).normalized * 0.12f);
            }

            foreach (var s in shrines)
            {
                float p = 0.5f + 0.5f * Mathf.Sin(s.pulse * 2.5f);
                float fill = s.isGoal ? (def.quota > 0 ? (float)delivered / def.quota : 0f) : (s.done ? 1f : (float)s.have / Mathf.Max(1, s.need));
                s.glow.transform.localScale = Vector3.one * (2.2f + fill * 1.6f + p * 0.2f);
                s.glow.color = s.isGoal ? new Color(1f, 0.8f, 0.4f, 0.1f + fill * 0.35f) : new Color(1f, 0.45f, 0.35f, 0.1f + fill * 0.3f + (s.done ? 0.1f : 0f));
                bool near = Vector2.Distance(pPos, s.pos) < 1.2f;
                float bounce = near ? 1.08f : 1f;
                float baseSize = s.isGoal ? 1.5f : 1.05f;
                s.t.localScale = Vector3.one * baseSize * bounce;
                s.sr.color = s.done ? new Color(0.7f, 0.7f, 0.7f, 0.7f) : Color.white;
            }

            foreach (var g in gates)
            {
                if (!g.open) { g.sr.color = new Color(1f, 0.75f, 0.3f, 0.7f + 0.15f * Mathf.Sin(time * 3f)); continue; }
                if (g.fade > 0f)
                {
                    g.fade -= dt * 2f;
                    g.sr.color = new Color(1f, 0.85f, 0.4f, Mathf.Max(0f, g.fade) * 0.8f);
                    g.sr.transform.localScale = new Vector3(g.rect.width, g.rect.height * Mathf.Max(0.05f, g.fade), 1f);
                    if (g.fade <= 0f) g.sr.gameObject.SetActive(false);
                }
            }

            foreach (var w in winds)
            {
                foreach (var m in w.motes)
                {
                    Vector3 lp = m.localPosition + (Vector3)(w.force * dt * 1.2f);
                    if (lp.x > w.rect.xMax) lp.x = w.rect.xMin;
                    if (lp.x < w.rect.xMin) lp.x = w.rect.xMax;
                    if (lp.y > w.rect.yMax) lp.y = w.rect.yMin;
                    if (lp.y < w.rect.yMin) lp.y = w.rect.yMax;
                    m.localPosition = lp;
                }
            }

            foreach (var d in dews)
            {
                if (d.taken) continue;
                d.t.localPosition = new Vector3(d.pos.x, d.pos.y + Mathf.Sin(time * 2f + d.pos.x) * 0.08f, 0f);
                d.sr.color = new Color(1f, 1f, 1f, Mathf.Max(0.5f, Visibility(d.pos)));
            }

            for (int i = sparks.Count - 1; i >= 0; i--)
            {
                var s = sparks[i];
                s.life -= dt;
                if (s.life <= 0f) { Destroy(s.t.gameObject); sparks.RemoveAt(i); continue; }
                s.vel *= Mathf.Exp(-2.5f * dt);
                s.t.localPosition += (Vector3)(s.vel * dt);
                float k = s.life / s.maxLife;
                s.t.localScale = Vector3.one * s.size * (0.4f + 0.6f * k);
                var c = s.sr.color; c.a = k; s.sr.color = c;
            }

            for (int i = beams.Count - 1; i >= 0; i--)
            {
                var b = beams[i];
                b.life -= dt;
                if (b.life <= 0f) { Destroy(b.t.gameObject); beams.RemoveAt(i); continue; }
                var c = b.sr.color; c.a = b.life / 0.7f; b.sr.color = c;
            }

            // drifting ambience
            for (int i = 0; i < world.childCount; i++)
            {
                var ch = world.GetChild(i);
                if (!ch.name.StartsWith("Mote")) continue;
                var lp = ch.localPosition;
                lp.y += dt * 0.15f;
                lp.x += Mathf.Sin(time * 0.6f + i) * dt * 0.1f;
                if (lp.y > FkStages.HalfH) lp.y = -FkStages.HalfH;
                ch.localPosition = lp;
            }
        }

        void Burst(Vector2 at, Color c, int n, float speed)
        {
            if (world == null) return;
            for (int i = 0; i < n && sparks.Count < 160; i++)
            {
                var sr = Spr("Spark", world, i % 2 == 0 ? sSpark : sGlow, at, 0.25f, c, 20);
                float life = 0.4f + UnityEngine.Random.value * 0.4f;
                sparks.Add(new Spark { t = sr.transform, sr = sr, vel = UnityEngine.Random.insideUnitCircle.normalized * speed * (0.4f + UnityEngine.Random.value), life = life, maxLife = life, size = 0.18f + UnityEngine.Random.value * 0.2f });
            }
        }

        void RefreshHud()
        {
            if (def == null || hudPanel == null) return;
            for (int i = 0; i < 3; i++) hudHearts[i].color = i < hearts ? Color.white : new Color(1f, 1f, 1f, 0.15f);
            oilFill.fillAmount = Mathf.Clamp01(oil / 100f);
            oilFill.color = oil < 25f ? new Color(1f, 0.4f, 0.3f) : Gold;
            hudStage.text = FkLocale.Format("night", lang, stageIndex + 1);
            hudTime.text = elapsed.ToString("0.0") + " / " + Mathf.RoundToInt(def.par);
            if (def.boss)
            {
                hudCountIcon.sprite = sTalisman;
                hudCount.text = chain.Count.ToString();
                bossFill.fillAmount = bossHp / 3f;
            }
            else
            {
                hudCountIcon.sprite = sLantern;
                hudCount.text = delivered + "/" + def.quota;
            }
            foreach (var s in shrines) UpdateShrineLabel(s);
        }
    }
}
