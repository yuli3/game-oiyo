using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class WhackAMolePlayer : MonoBehaviour
{
    public enum Language { KO, EN, JA, ES }
    private Language currentLang = Language.KO;

    // Page language beyond the game's own four (scripts/unity/oiyo-i18n).
    string LangCode() => currentLang == Language.EN ? OiyoI18n.ForEnglish : currentLang.ToString().ToLowerInvariant();
    string U(string en) => OiyoI18n.Ui(en, LangCode());
    string F(string en, params object[] args) => string.Format(U(en), args);

    public class LocalizedText
    {
        public string ko;
        public string en;
        public string ja;
        public string es;

        public LocalizedText(string ko, string en, string ja, string es)
        {
            this.ko = ko;
            this.en = en;
            this.ja = ja;
            this.es = es;
        }

        public string Get(Language lang)
        {
            switch (lang)
            {
                case Language.KO: return ko;
                case Language.EN: return OiyoI18n.En(en);
                case Language.JA: return ja;
                case Language.ES: return es;
                default: return en;
            }
        }
    }

    public enum CritterType { Normal, Golden, Bomb, HardHat, KingBoss }

    public class MoleCritter
    {
        public int holeIndex;
        public CritterType type;
        public float currentY;
        public float targetY;
        public float popTimer;
        public float maxStayDuration;
        public int hp;
        public int maxHp;
        public bool isHit = false;
        public bool isRetreating = false;
        public GameObject rootGo;
        public GameObject headGo;
        public GameObject accessoryGo; // Helmet, Crown, Dynamite Fuse
    }

    public class FloatingFeedback
    {
        public string text;
        public Vector3 pos;
        public Color color;
        public float timer = 0f;
        public float duration = 1.0f;
    }

    public class StarParticle
    {
        public Vector3 pos;
        public Vector3 vel;
        public Color color;
        public float scale;
        public float life = 0f;
        public float maxLife = 0.5f;
        public GameObject go;
    }

    public class StageDef
    {
        public int stageNum;
        public LocalizedText name;
        public LocalizedText briefing;
        public int targetScore;
        public float moleSpeed;
        public float spawnInterval;
        public bool allowBombs;
        public bool allowHardHat;
        public bool isMegaField; // 4x4 instead of 3x3
        public bool hasBoss;
    }

    // Grid Dimensions
    private int gridCols = 3;
    private int gridRows = 3;
    private float holeSpacing = 2.6f;
    private Vector3 boardCenter = new Vector3(0f, 0f, 0f);
    private List<Vector3> holePositions = new List<Vector3>();
    private List<GameObject> holeRimGos = new List<GameObject>();

    // Active Moles
    private MoleCritter[] activeCritters;

    // 3D Hammer / Mallet
    private GameObject malletRootGo;
    private GameObject malletHeadGo;
    private GameObject malletHandleGo;
    private Vector3 targetMalletPos;
    private float swingProgress = 1.0f;
    private bool isSwinging = false;

    // Camera & Lighting
    private Camera mainCam;
    private Light dirLight;
    private GameObject carnivalTableGo;

    // Materials
    private Material tableMat;
    private Material holeMat;
    private Material moleMat;
    private Material goldenMat;
    private Material bombMat;
    private Material helmetMat;
    private Material crownMat;
    private Material malletWoodMat;
    private Material noseMat;

    // Visuals & Feedback
    private List<FloatingFeedback> floatingTexts = new List<FloatingFeedback>();
    private List<StarParticle> activeStars = new List<StarParticle>();
    private float shakeTrauma = 0f;

    // Gameplay Stats
    public enum GameState { Playing, Victory, GameOver }
    private GameState state = GameState.Playing;
    private int score = 0;
    private int bestScore = 0;
    private int currentCombo = 0;
    private int maxComboAchieved = 0;
    private int molesWhacked = 0;
    private int bombsHit = 0;
    private float roundTimeRemaining = 45f;
    private int currentStageIdx = 0;
    private bool isEndlessMode = false;
    private bool showStageSelect = false;
    private Vector2 stageSelectScroll;

    // Audio
    private AudioSource sfxSource;

    // Stages (30 Stages)
    private List<StageDef> stages = new List<StageDef>();

    private void Awake()
    {
        switch (OiyoLang.Pick("ko", "en", "ja", "es")) { case "en": currentLang = Language.EN; break; case "ja": currentLang = Language.JA; break; case "es": currentLang = Language.ES; break; default: currentLang = Language.KO; break; }
        InitStages();
        SetupCameraAndLighting();
        CreateMaterials();
        BuildCarnivalTable();
        BuildMalletModel();
        SetupAudio();
        LoadStage(0);
    }


    private void InitStages()
    {
        stages.Clear();

        // Stage 1
        stages.Add(new StageDef
        {
            stageNum = 1,
            name = new LocalizedText("Stage 1: 초심자의 농장", "Stage 1: Beginner's Farm", "Stage 1: 初心者の農場", "Etapa 1: Granja Inicial"),
            briefing = new LocalizedText("튀어나오는 두더지를 망치로 때려 1,000점을 달성하세요!", "Whack emerging moles with your mallet to score 1,000 pts!", "飛び出すモグラをハンマーで叩いて1,000点を達成しましょう！", "¡Golpea a los topos con el mazo para sumar 1,000 pts!"),
            targetScore = 1000,
            moleSpeed = 1.0f,
            spawnInterval = 1.3f,
            allowBombs = false,
            allowHardHat = false,
            isMegaField = false,
            hasBoss = false
        });

        // Stage 2
        stages.Add(new StageDef
        {
            stageNum = 2,
            name = new LocalizedText("Stage 2: 빠른 발 두더지", "Stage 2: Quick Burrowers", "Stage 2: 素早いモグラ", "Etapa 2: Topos Veloces"),
            briefing = new LocalizedText("더 빠르게 들어가는 민첩한 두더지를 잡고 1,800점을 얻으세요!", "React faster to quick burrowing moles and score 1,800 pts!", "素早く隠れるモグラを叩いて1,800点を獲得しましょう！", "¡Reacciona rápido a los topos ágiles y suma 1,800 pts!"),
            targetScore = 1800,
            moleSpeed = 1.35f,
            spawnInterval = 1.1f,
            allowBombs = false,
            allowHardHat = false,
            isMegaField = false,
            hasBoss = false
        });

        // Stage 3
        stages.Add(new StageDef
        {
            stageNum = 3,
            name = new LocalizedText("Stage 3: 폭탄 주의보", "Stage 3: Dynamite Danger", "Stage 3: 爆弾警報", "Etapa 3: Peligro Dinamita"),
            briefing = new LocalizedText("빨간 다이너마이트 폭탄을 피해 두더지만 골라 때려 2,500점을 달성하세요!", "Avoid hitting dangerous dynamite bombs and score 2,500 pts!", "赤いダイナマイトを避けてモグラだけを叩き、2,500点を達成しましょう！", "¡Evita golpear la dinamita y suma 2,500 pts golpeando topos!"),
            targetScore = 2500,
            moleSpeed = 1.25f,
            spawnInterval = 1.0f,
            allowBombs = true,
            allowHardHat = false,
            isMegaField = false,
            hasBoss = false
        });

        // Stage 4
        stages.Add(new StageDef
        {
            stageNum = 4,
            name = new LocalizedText("Stage 4: 철모 두더지의 등장", "Stage 4: Hard Hat Moles", "Stage 4: 鉄兜モグラ登場", "Etapa 4: Topos con Casco"),
            briefing = new LocalizedText("단단한 철모를 쓴 두더지는 2번 때려야 잡힙니다! 3,200점을 달성하세요!", "Hard Hat moles require 2 hits to defeat! Score 3,200 pts!", "頑丈な鉄兜モグラは2回叩く必要があります！3,200点を達成しましょう！", "¡Los topos con casco requieren 2 golpes! Anota 3,200 pts!"),
            targetScore = 3200,
            moleSpeed = 1.3f,
            spawnInterval = 1.0f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = false,
            hasBoss = false
        });

        // Stage 5
        stages.Add(new StageDef
        {
            stageNum = 5,
            name = new LocalizedText("Stage 5: 두더지 군단 습격 [중간보스]", "Stage 5: Mole Swarm [Mid-Boss]", "Stage 5: モグラ軍団の襲撃 [中ボス]", "Etapa 5: Enjambre de Topos [Jefe Medio]"),
            briefing = new LocalizedText("한 번에 여러 마리가 동시에 튀어나오는 군단을 제압하고 4,000점을 얻으세요!", "Whack multiple moles surfacing simultaneously to score 4,000 pts!", "同時に複数飛び出すモグラ軍団を制圧し、4,000点を獲得しましょう！", "¡Controla las salidas simultáneas y alcanza 4,000 pts!"),
            targetScore = 4000,
            moleSpeed = 1.45f,
            spawnInterval = 0.85f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = false,
            hasBoss = false
        });

        // Stage 6
        stages.Add(new StageDef
        {
            stageNum = 6,
            name = new LocalizedText("Stage 6: 황금 두더지 축제", "Stage 6: Golden Mole Bonanza", "Stage 6: 黄金モグラフェスティバル", "Etapa 6: Festival de Topos Dorados"),
            briefing = new LocalizedText("보너스 300점을 주는 반짝이는 황금 두더지를 집중 타격해 5,000점을 돌파하세요!", "Target glowing golden moles for +300 bonus pts to score 5,000!", "ボーナス300点を獲得できる黄金モグラを狙って5,000点を突破しましょう！", "¡Apunta a los topos dorados (+300 pts) y supera 5,000 pts!"),
            targetScore = 5000,
            moleSpeed = 1.5f,
            spawnInterval = 0.8f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = false,
            hasBoss = false
        });

        // Stage 7
        stages.Add(new StageDef
        {
            stageNum = 7,
            name = new LocalizedText("Stage 7: 4x4 메가 필드", "Stage 7: 4x4 Mega Field", "Stage 7: 4x4 メガフィールド", "Etapa 7: Campo Mega 4x4"),
            briefing = new LocalizedText("16개 구멍으로 확장된 메가 필드에서 6,000점을 달성하세요!", "Keep track of 16 holes on the expanded 4x4 board to score 6,000 pts!", "16個の穴に拡張されたメガフィールドで6,000点を達成しましょう！", "¡Domina los 16 agujeros del tablero 4x4 y alcanza 6,000 pts!"),
            targetScore = 6000,
            moleSpeed = 1.4f,
            spawnInterval = 0.75f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 8
        stages.Add(new StageDef
        {
            stageNum = 8,
            name = new LocalizedText("Stage 8: 시한폭탄 카운트다운", "Stage 8: Ticking Bomb Rush", "Stage 8: 時限爆弾ラッシュ", "Etapa 8: Carrera de Bombas"),
            briefing = new LocalizedText("대량으로 섞여 나오는 다이너마이트를 피해 침착하게 7,000점을 달성하세요!", "Stay calm among heavy dynamite spawns and score 7,000 pts!", "大量の爆弾を避けて冷静に7,000点を達成しましょう！", "¡Mantén la calma entre tantas bombas y logra 7,000 pts!"),
            targetScore = 7000,
            moleSpeed = 1.6f,
            spawnInterval = 0.7f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = false,
            hasBoss = false
        });

        // Stage 9
        stages.Add(new StageDef
        {
            stageNum = 9,
            name = new LocalizedText("Stage 9: 7연속 콤보 마스터", "Stage 9: 7-Combo Mastery", "Stage 9: 7連続コンボマスター", "Etapa 9: Maestría de 7 Combos"),
            briefing = new LocalizedText("실수 없이 연속으로 7마리를 타격하여 8,000점을 돌파하세요!", "Maintain a streak of 7 consecutive hits and score 8,000 pts!", "ミスなく7連続ヒットを達成して8,000点を突破しましょう！", "¡Consigue 7 aciertos consecutivos sin fallar y supera 8,000 pts!"),
            targetScore = 8000,
            moleSpeed = 1.65f,
            spawnInterval = 0.7f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = false,
            hasBoss = false
        });

        // Stage 10
        stages.Add(new StageDef
        {
            stageNum = 10,
            name = new LocalizedText("Stage 10: 두더지 대왕의 제단 [최종보스]", "Stage 10: King Mole's Altar [Boss]", "Stage 10: モグラ大王の祭壇 [最終ボス]", "Etapa 10: Altar del Rey Topo [Jefe Final]"),
            briefing = new LocalizedText("왕관을 쓴 거대한 두더지 대왕(HP 5)을 격파하고 9,500점을 획득하세요!", "Defeat the crowned giant King Mole (HP 5) and score 9,500 pts!", "王冠をかぶった巨大モグラ大王(HP 5)を撃破して9,500点を獲得しましょう！", "¡Derrota al Rey Topo gigante (HP 5) y suma 9,500 pts!"),
            targetScore = 9500,
            moleSpeed = 1.7f,
            spawnInterval = 0.65f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = false,
            hasBoss = true
        });

        // Stage 11
        stages.Add(new StageDef
        {
            stageNum = 11,
            name = new LocalizedText("Stage 11: 초광속 두더지 대격돌 [시크릿]", "Stage 11: Hyper Mole Blitz [Secret]", "Stage 11: 超光速モグラ大激突 [シークレット]", "Etapa 11: Asalto Hiperveloz [Secreto]"),
            briefing = new LocalizedText("빛의 속도로 출현하는 두더지들을 타격하여 11,000점을 달성하세요!", "Strike lightning-fast moles and achieve 11,000 pts!", "光の速度で飛び出すモグラを叩いて11,000点を達成しましょう！", "¡Golpea a topos a la velocidad del rayo y logra 11,000 pts!"),
            targetScore = 11000,
            moleSpeed = 1.9f,
            spawnInterval = 0.6f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 12
        stages.Add(new StageDef
        {
            stageNum = 12,
            name = new LocalizedText("Stage 12: 궁극의 해머 마스터 [마스터 피날레]", "Stage 12: Ultimate Hammer Master [Finale]", "Stage 12: 究極のハンマーマスター [フィナーレ]", "Etapa 12: Maestro Supremo del Mazo [Final]"),
            briefing = new LocalizedText("모든 시련을 극복하고 13,000점을 달성하여 전설의 해머 마스터가 되세요!", "Overcome all challenges to score 13,000 pts and become the hammer legend!", "すべての試練を乗り越えて13,000点を達成し、伝説のマスターになりましょう！", "¡Supera todas las pruebas para alcanzar 13,000 pts y ser leyenda!"),
            targetScore = 13000,
            moleSpeed = 2.0f,
            spawnInterval = 0.55f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = true
        });

        // Stages 13-30: +600 target, +0.03 mole speed, -0.008 s spawn gap per stage; a boss every 5th stage
        // Stage 13
        stages.Add(new StageDef
        {
            stageNum = 13,
            name = new LocalizedText("Stage 13: 달빛 밭", "Stage 13: Moonlit Field", "Stage 13: 月夜の畑", "Etapa 13: Campo a la Luz de la Luna"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 13,600점을 달성하세요!", "Catch even faster moles and score 13,600 pts!", "さらに速いモグラを叩いて13,600点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 13,600 pts!"),
            targetScore = 13600,
            moleSpeed = 2.03f,
            spawnInterval = 0.542f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 14
        stages.Add(new StageDef
        {
            stageNum = 14,
            name = new LocalizedText("Stage 14: 당근 창고 소동", "Stage 14: Carrot Barn Ruckus", "Stage 14: ニンジン倉庫の騒ぎ", "Etapa 14: Alboroto en el Granero"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 14,200점을 달성하세요!", "Catch even faster moles and score 14,200 pts!", "さらに速いモグラを叩いて14,200点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 14,200 pts!"),
            targetScore = 14200,
            moleSpeed = 2.06f,
            spawnInterval = 0.534f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 15
        stages.Add(new StageDef
        {
            stageNum = 15,
            name = new LocalizedText("Stage 15: 땅굴 왕자의 습격 [보스]", "Stage 15: Burrow Prince Raid [Boss]", "Stage 15: 穴掘り王子の襲撃 [ボス]", "Etapa 15: Asalto del Príncipe Excavador [Jefe]"),
            briefing = new LocalizedText("보스 두더지가 섞여 나와요. 14,800점을 달성하세요!", "A boss mole joins the field. Score 14,800 pts!", "ボスモグラが混ざって出現！14,800点を達成しましょう！", "¡Un topo jefe entra en el campo! Logra 14,800 pts."),
            targetScore = 14800,
            moleSpeed = 2.09f,
            spawnInterval = 0.526f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = true
        });

        // Stage 16
        stages.Add(new StageDef
        {
            stageNum = 16,
            name = new LocalizedText("Stage 16: 비 오는 진흙밭", "Stage 16: Rainy Mud Patch", "Stage 16: 雨のぬかるみ畑", "Etapa 16: Lodazal Lluvioso"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 15,400점을 달성하세요!", "Catch even faster moles and score 15,400 pts!", "さらに速いモグラを叩いて15,400点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 15,400 pts!"),
            targetScore = 15400,
            moleSpeed = 2.12f,
            spawnInterval = 0.518f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 17
        stages.Add(new StageDef
        {
            stageNum = 17,
            name = new LocalizedText("Stage 17: 쌍둥이 폭탄 골목", "Stage 17: Twin Fuse Alley", "Stage 17: 双子爆弾横丁", "Etapa 17: Callejón de Mechas Gemelas"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 16,000점을 달성하세요!", "Catch even faster moles and score 16,000 pts!", "さらに速いモグラを叩いて16,000点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 16,000 pts!"),
            targetScore = 16000,
            moleSpeed = 2.15f,
            spawnInterval = 0.510f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 18
        stages.Add(new StageDef
        {
            stageNum = 18,
            name = new LocalizedText("Stage 18: 철모 부대 행진", "Stage 18: Hard Hat Parade", "Stage 18: 鉄兜隊の行進", "Etapa 18: Desfile de Cascos"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 16,600점을 달성하세요!", "Catch even faster moles and score 16,600 pts!", "さらに速いモグラを叩いて16,600点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 16,600 pts!"),
            targetScore = 16600,
            moleSpeed = 2.18f,
            spawnInterval = 0.502f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 19
        stages.Add(new StageDef
        {
            stageNum = 19,
            name = new LocalizedText("Stage 19: 황금 수확제", "Stage 19: Golden Harvest Fair", "Stage 19: 黄金の収穫祭", "Etapa 19: Feria de la Cosecha Dorada"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 17,200점을 달성하세요!", "Catch even faster moles and score 17,200 pts!", "さらに速いモグラを叩いて17,200点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 17,200 pts!"),
            targetScore = 17200,
            moleSpeed = 2.21f,
            spawnInterval = 0.494f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 20
        stages.Add(new StageDef
        {
            stageNum = 20,
            name = new LocalizedText("Stage 20: 두더지 여왕의 정원 [보스]", "Stage 20: Mole Queen's Garden [Boss]", "Stage 20: モグラ女王の庭 [ボス]", "Etapa 20: Jardín de la Reina Topo [Jefe]"),
            briefing = new LocalizedText("보스 두더지가 섞여 나와요. 17,800점을 달성하세요!", "A boss mole joins the field. Score 17,800 pts!", "ボスモグラが混ざって出現！17,800点を達成しましょう！", "¡Un topo jefe entra en el campo! Logra 17,800 pts."),
            targetScore = 17800,
            moleSpeed = 2.24f,
            spawnInterval = 0.486f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = true
        });

        // Stage 21
        stages.Add(new StageDef
        {
            stageNum = 21,
            name = new LocalizedText("Stage 21: 번개 손목 훈련", "Stage 21: Lightning Wrist Drill", "Stage 21: 稲妻リストドリル", "Etapa 21: Entrenamiento Muñeca Relámpago"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 18,400점을 달성하세요!", "Catch even faster moles and score 18,400 pts!", "さらに速いモグラを叩いて18,400点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 18,400 pts!"),
            targetScore = 18400,
            moleSpeed = 2.27f,
            spawnInterval = 0.478f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 22
        stages.Add(new StageDef
        {
            stageNum = 22,
            name = new LocalizedText("Stage 22: 반딧불 밤 농장", "Stage 22: Firefly Night Farm", "Stage 22: ホタルの夜の農場", "Etapa 22: Granja Nocturna de Luciérnagas"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 19,000점을 달성하세요!", "Catch even faster moles and score 19,000 pts!", "さらに速いモグラを叩いて19,000点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 19,000 pts!"),
            targetScore = 19000,
            moleSpeed = 2.30f,
            spawnInterval = 0.470f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 23
        stages.Add(new StageDef
        {
            stageNum = 23,
            name = new LocalizedText("Stage 23: 폭탄 지뢰밭", "Stage 23: Fuse Minefield", "Stage 23: 爆弾地雷原", "Etapa 23: Campo de Mechas"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 19,600점을 달성하세요!", "Catch even faster moles and score 19,600 pts!", "さらに速いモグラを叩いて19,600点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 19,600 pts!"),
            targetScore = 19600,
            moleSpeed = 2.33f,
            spawnInterval = 0.462f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 24
        stages.Add(new StageDef
        {
            stageNum = 24,
            name = new LocalizedText("Stage 24: 15연속 콤보 도전", "Stage 24: 15-Combo Challenge", "Stage 24: 15連続コンボ挑戦", "Etapa 24: Desafío de 15 Combos"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 20,200점을 달성하세요!", "Catch even faster moles and score 20,200 pts!", "さらに速いモグラを叩いて20,200点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 20,200 pts!"),
            targetScore = 20200,
            moleSpeed = 2.36f,
            spawnInterval = 0.454f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 25
        stages.Add(new StageDef
        {
            stageNum = 25,
            name = new LocalizedText("Stage 25: 땅굴 장군의 요새 [보스]", "Stage 25: Burrow General's Fort [Boss]", "Stage 25: 穴掘り将軍の砦 [ボス]", "Etapa 25: Fuerte del General Excavador [Jefe]"),
            briefing = new LocalizedText("보스 두더지가 섞여 나와요. 20,800점을 달성하세요!", "A boss mole joins the field. Score 20,800 pts!", "ボスモグラが混ざって出現！20,800点を達成しましょう！", "¡Un topo jefe entra en el campo! Logra 20,800 pts."),
            targetScore = 20800,
            moleSpeed = 2.39f,
            spawnInterval = 0.446f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = true
        });

        // Stage 26
        stages.Add(new StageDef
        {
            stageNum = 26,
            name = new LocalizedText("Stage 26: 눈보라 들판", "Stage 26: Blizzard Field", "Stage 26: 吹雪の畑", "Etapa 26: Campo de Ventisca"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 21,400점을 달성하세요!", "Catch even faster moles and score 21,400 pts!", "さらに速いモグラを叩いて21,400点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 21,400 pts!"),
            targetScore = 21400,
            moleSpeed = 2.42f,
            spawnInterval = 0.438f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 27
        stages.Add(new StageDef
        {
            stageNum = 27,
            name = new LocalizedText("Stage 27: 초음속 두더지", "Stage 27: Supersonic Moles", "Stage 27: 超音速モグラ", "Etapa 27: Topos Supersónicos"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 22,000점을 달성하세요!", "Catch even faster moles and score 22,000 pts!", "さらに速いモグラを叩いて22,000点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 22,000 pts!"),
            targetScore = 22000,
            moleSpeed = 2.45f,
            spawnInterval = 0.430f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 28
        stages.Add(new StageDef
        {
            stageNum = 28,
            name = new LocalizedText("Stage 28: 마지막 수확", "Stage 28: Last Harvest", "Stage 28: 最後の収穫", "Etapa 28: Última Cosecha"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 22,600점을 달성하세요!", "Catch even faster moles and score 22,600 pts!", "さらに速いモグラを叩いて22,600点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 22,600 pts!"),
            targetScore = 22600,
            moleSpeed = 2.48f,
            spawnInterval = 0.422f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 29
        stages.Add(new StageDef
        {
            stageNum = 29,
            name = new LocalizedText("Stage 29: 망치 장인의 시험", "Stage 29: Hammer Artisan Trial", "Stage 29: ハンマー職人の試練", "Etapa 29: Prueba del Artesano del Mazo"),
            briefing = new LocalizedText("더 빨라진 두더지를 잡아 23,200점을 달성하세요!", "Catch even faster moles and score 23,200 pts!", "さらに速いモグラを叩いて23,200点を達成しましょう！", "¡Golpea topos aún más rápidos y logra 23,200 pts!"),
            targetScore = 23200,
            moleSpeed = 2.51f,
            spawnInterval = 0.414f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = false
        });

        // Stage 30
        stages.Add(new StageDef
        {
            stageNum = 30,
            name = new LocalizedText("Stage 30: 땅속 황제의 왕좌 [그랜드 피날레]", "Stage 30: Underground Emperor's Throne [Grand Finale]", "Stage 30: 地底皇帝の玉座 [グランドフィナーレ]", "Etapa 30: Trono del Emperador Subterráneo [Gran Final]"),
            briefing = new LocalizedText("보스 두더지가 섞여 나와요. 23,800점을 달성하세요!", "A boss mole joins the field. Score 23,800 pts!", "ボスモグラが混ざって出現！23,800点を達成しましょう！", "¡Un topo jefe entra en el campo! Logra 23,800 pts."),
            targetScore = 23800,
            moleSpeed = 2.54f,
            spawnInterval = 0.406f,
            allowBombs = true,
            allowHardHat = true,
            isMegaField = true,
            hasBoss = true
        });
    }

    private void SetupCameraAndLighting()
    {
        var camGo = new GameObject("Arcade Camera");
        mainCam = camGo.AddComponent<Camera>();
        mainCam.transform.position = new Vector3(0f, 11.5f, -8.2f);
        mainCam.transform.rotation = Quaternion.Euler(54f, 0f, 0f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.08f, 0.10f, 0.16f, 1f); // Arcade Navy
        mainCam.orthographic = true;
        mainCam.orthographicSize = 6.4f;

        var lightGo = new GameObject("StageLight");
        dirLight = lightGo.AddComponent<Light>();
        dirLight.type = LightType.Directional;
        dirLight.color = new Color(1f, 0.98f, 0.92f);
        dirLight.intensity = 1.25f;
        lightGo.transform.rotation = Quaternion.Euler(50f, -25f, 0f);
    }

    // ---- Painted art (scripts/make_art.py -> Resources/WM) ----
    private static readonly Dictionary<string, Texture2D> artTex = new Dictionary<string, Texture2D>();

    private static Texture2D ArtTex(string name)
    {
        if (!artTex.TryGetValue(name, out var t))
        {
            t = Resources.Load<Texture2D>("WM/" + name);
            if (t != null) t.wrapMode = TextureWrapMode.Clamp;
            artTex[name] = t;
        }
        return t;
    }

    private static Material SpriteMat(string texName, Color tint, int queue)
    {
        var m = new Material(Shader.Find("Sprites/Default"));
        m.mainTexture = ArtTex(texName);
        m.color = tint;
        m.renderQueue = queue;
        return m;
    }

    private static GameObject ArtQuad(string name)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
        go.name = name;
        Destroy(go.GetComponent<Collider>());
        return go;
    }

    // Sprites face the tilted orthographic camera.
    private static readonly Quaternion FaceCam = Quaternion.Euler(54f, 0f, 0f);

    private void CreateMaterials()
    {
        Shader lit = Shader.Find("Universal Render Pipeline/Lit");
        if (lit == null) lit = Shader.Find("Standard");

        tableMat = new Material(OiyoShaders.Safe(lit));
        tableMat.color = new Color(0.8f, 0.8f, 0.8f); // the scene light is bright; keep the felt deep
        tableMat.mainTexture = ArtTex("table"); // felt top with a stitched wooden rim

        holeMat = new Material(OiyoShaders.Safe(lit));
        holeMat.color = new Color(0.04f, 0.05f, 0.08f); // Black Hole Depth

        moleMat = new Material(OiyoShaders.Safe(lit));
        moleMat.color = new Color(0.48f, 0.32f, 0.18f); // Warm Mole Brown

        goldenMat = new Material(OiyoShaders.Safe(lit));
        goldenMat.color = new Color(1.0f, 0.85f, 0.10f); // Shiny Gold

        bombMat = new Material(OiyoShaders.Safe(lit));
        bombMat.color = new Color(0.95f, 0.18f, 0.18f); // Danger Red

        helmetMat = new Material(OiyoShaders.Safe(lit));
        helmetMat.color = new Color(0.92f, 0.80f, 0.10f); // Construction Hard Hat

        crownMat = new Material(OiyoShaders.Safe(lit));
        crownMat.color = new Color(0.98f, 0.84f, 0.0f); // Royal Gold

        malletWoodMat = new Material(OiyoShaders.Safe(lit));
        malletWoodMat.color = new Color(0.72f, 0.72f, 0.72f);
        malletWoodMat.mainTexture = ArtTex("wood");

        noseMat = new Material(OiyoShaders.Safe(lit));
        noseMat.color = new Color(0.95f, 0.65f, 0.65f); // Pink Nose
    }

    private void BuildCarnivalTable()
    {
        carnivalTableGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        carnivalTableGo.name = "CarnivalTable";
        carnivalTableGo.transform.position = new Vector3(0f, -0.4f, 0f);
        carnivalTableGo.transform.localScale = new Vector3(10.5f, 0.8f, 9.5f);
        carnivalTableGo.GetComponent<Renderer>().material = tableMat;

        // Fairground tent backdrop far behind the table, drawn before everything else
        var bg = ArtQuad("Backdrop");
        bg.transform.position = mainCam.transform.position + mainCam.transform.forward * 30f;
        bg.transform.rotation = FaceCam;
        bg.transform.localScale = new Vector3(44f, 22f, 1f);
        bg.GetComponent<Renderer>().material = SpriteMat("backdrop", Color.white, 1000);
    }

    private void BuildMalletModel()
    {
        malletRootGo = new GameObject("Mallet");
        malletRootGo.transform.position = new Vector3(0f, 3.5f, 0f);

        // Mallet Head (Horizontal Cylinder)
        malletHeadGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        malletHeadGo.name = "Head";
        malletHeadGo.transform.SetParent(malletRootGo.transform);
        malletHeadGo.transform.localPosition = Vector3.zero;
        malletHeadGo.transform.localScale = new Vector3(0.9f, 0.7f, 0.9f);
        malletHeadGo.transform.rotation = Quaternion.Euler(0f, 0f, 90f);
        malletHeadGo.GetComponent<Renderer>().material = malletWoodMat;

        // Mallet Handle (Vertical Cylinder)
        malletHandleGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        malletHandleGo.name = "Handle";
        malletHandleGo.transform.SetParent(malletRootGo.transform);
        malletHandleGo.transform.localPosition = new Vector3(0f, 1.2f, 0f);
        malletHandleGo.transform.localScale = new Vector3(0.25f, 1.2f, 0.25f);
        malletHandleGo.GetComponent<Renderer>().material = malletWoodMat;

        targetMalletPos = new Vector3(0f, 3.5f, 0f);
    }

    private void SetupAudio()
    {
        sfxSource = gameObject.AddComponent<AudioSource>();
        sfxSource.playOnAwake = false;
        sfxSource.volume = 0.85f;
    }

    private void PlayTone(float freq, float duration, string wave = "sine", float vol = 0.45f)
    {
        int sampleRate = 44100;
        int count = Mathf.CeilToInt(sampleRate * duration);
        float[] samples = new float[count];

        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 6f);
            float angle = 2f * Mathf.PI * freq * t;
            float val = 0f;

            if (wave == "sine") val = Mathf.Sin(angle);
            else if (wave == "triangle") val = Mathf.PingPong(t * freq * 4f, 2f) - 1f;
            else if (wave == "square") val = Mathf.Sin(angle) > 0f ? 0.5f : -0.5f;
            else val = (UnityEngine.Random.value * 2f - 1f);

            samples[i] = val * env * vol;
        }

        AudioClip clip = AudioClip.Create("SFX", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        sfxSource.PlayOneShot(clip);
    }

    private void PlayBonkSound(int combo)
    {
        float[] pentatonic = { 329.63f, 392.00f, 440.00f, 523.25f, 587.33f, 659.25f, 783.99f };
        int idx = Mathf.Clamp(combo, 0, pentatonic.Length - 1);
        PlayTone(pentatonic[idx], 0.25f, "triangle", 0.5f);
        PlayTone(160f, 0.12f, "square", 0.35f);
    }

    private void PlayExplosionSound()
    {
        PlayTone(100f, 0.55f, "noise", 0.85f);
    }

    public void LoadStage(int stageIdx)
    {
        currentStageIdx = Mathf.Clamp(stageIdx, 0, stages.Count - 1);
        StageDef stage = stages[currentStageIdx];

        state = GameState.Playing;
        score = 0;
        currentCombo = 0;
        maxComboAchieved = 0;
        molesWhacked = 0;
        bombsHit = 0;
        roundTimeRemaining = 45f;
        showStageSelect = false;

        ClearHolesAndCritters();
        BuildGridHoles(stage.isMegaField);

        activeCritters = new MoleCritter[holePositions.Count];

        PlayTone(520f, 0.3f, "triangle");
        SpawnFloatingFeedback(stage.name.Get(currentLang), new Vector3(0f, 2.5f, 0f), Color.cyan);
    }

    private void ClearHolesAndCritters()
    {
        foreach (var rim in holeRimGos)
        {
            if (rim != null) Destroy(rim);
        }
        holeRimGos.Clear();
        holePositions.Clear();

        if (activeCritters != null)
        {
            for (int i = 0; i < activeCritters.Length; i++)
            {
                if (activeCritters[i] != null && activeCritters[i].rootGo != null)
                {
                    Destroy(activeCritters[i].rootGo);
                }
            }
        }
    }

    private void BuildGridHoles(bool isMega)
    {
        gridCols = isMega ? 4 : 3;
        gridRows = isMega ? 4 : 3;
        holeSpacing = isMega ? 2.1f : 2.7f;

        float startX = -(gridCols - 1) * holeSpacing * 0.5f;
        float startZ = -(gridRows - 1) * holeSpacing * 0.5f;

        for (int r = 0; r < gridRows; r++)
        {
            for (int c = 0; c < gridCols; c++)
            {
                Vector3 pos = new Vector3(startX + c * holeSpacing, 0.05f, startZ + r * holeSpacing);
                holePositions.Add(pos);

                // Hole Rim (Flat black cylinder)
                var holeGo = ArtQuad(string.Format("Hole_{0}_{1}", r, c));
                holeGo.transform.position = pos;
                holeGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f); // lying on the felt
                holeGo.transform.localScale = new Vector3(2.0f, 2.0f, 1f);
                holeGo.GetComponent<Renderer>().material = SpriteMat("hole", Color.white, 2950);
                holeRimGos.Add(holeGo);
            }
        }
    }

    private void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("whack-a-mole", state, score);
        HandlePlayerInput();
        UpdateMalletPositionAndSwing();
        UpdateMoleSpawnsAndLifecycles();
        UpdateFloatingFeedbacks();
        UpdateStarParticles();
        UpdateCameraTrauma();
        UpdateTimer();
    }

    private void UpdateTimer()
    {
        if (state != GameState.Playing) return;

        if (!isEndlessMode)
        {
            roundTimeRemaining -= Time.deltaTime;
            if (roundTimeRemaining <= 0f)
            {
                roundTimeRemaining = 0f;
                CheckRoundEnd();
            }
        }
    }

    private void HandlePlayerInput()
    {
        Ray ray = mainCam.ScreenPointToRay(Input.mousePosition);
        Plane tablePlane = new Plane(Vector3.up, new Vector3(0f, 0.4f, 0f));
        float enter;

        if (tablePlane.Raycast(ray, out enter))
        {
            Vector3 hitPoint = ray.GetPoint(enter);
            targetMalletPos = hitPoint + new Vector3(0f, 1.8f, -0.6f);

            // Left Click / Tap -> Strike!
            if (Input.GetMouseButtonDown(0) && state == GameState.Playing && !isSwinging)
            {
                TriggerMalletSwing(hitPoint);
            }
        }
    }

    private void TriggerMalletSwing(Vector3 strikePos)
    {
        isSwinging = true;
        swingProgress = 0f;

        // Check which hole was struck
        int hitHoleIdx = -1;
        float minDist = 1.35f;

        for (int i = 0; i < holePositions.Count; i++)
        {
            float d = Vector2.Distance(new Vector2(strikePos.x, strikePos.z), new Vector2(holePositions[i].x, holePositions[i].z));
            if (d < minDist)
            {
                minDist = d;
                hitHoleIdx = i;
            }
        }

        if (hitHoleIdx >= 0)
        {
            OnHoleStruck(hitHoleIdx);
        }
        else
        {
            // Missed!
            currentCombo = 0;
            PlayTone(220f, 0.08f, "sine");
        }
    }

    private void OnHoleStruck(int holeIdx)
    {
        MoleCritter critter = activeCritters[holeIdx];
        if (critter != null && !critter.isHit && critter.currentY > -0.2f)
        {
            // Hit critter!
            critter.hp--;

            if (critter.type == CritterType.Bomb)
            {
                // Hit Bomb! Explosion!
                critter.isHit = true;
                critter.isRetreating = true;
                score = Mathf.Max(0, score - 200);
                bombsHit++;
                currentCombo = 0;
                shakeTrauma = 0.65f;
                PlayExplosionSound();
                SpawnFloatingFeedback(U("-200 BOOM!"), holePositions[holeIdx], Color.red);
                SpawnStars(holePositions[holeIdx], Color.red);
            }
            else if (critter.type == CritterType.HardHat && critter.hp > 0)
            {
                // Cracked helmet!
                PlayTone(880f, 0.12f, "square");
                if (critter.accessoryGo != null) Destroy(critter.accessoryGo);
                if (critter.headGo != null) critter.headGo.GetComponent<Renderer>().material.mainTexture = ArtTex("critter_HardHat_cracked");
                SpawnFloatingFeedback(U("CRACK!"), holePositions[holeIdx], Color.yellow);
            }
            else
            {
                // Defeated critter!
                critter.isHit = true;
                critter.isRetreating = true;
                molesWhacked++;
                currentCombo++;
                if (currentCombo > maxComboAchieved) maxComboAchieved = currentCombo;

                int baseScore = (critter.type == CritterType.Golden) ? 300 :
                                (critter.type == CritterType.KingBoss) ? 1000 : 100;
                int awarded = baseScore * Mathf.Max(1, currentCombo);
                score += awarded;

                if (score > bestScore) bestScore = score;

                shakeTrauma = 0.25f;
                PlayBonkSound(currentCombo);

                Color popCol = (critter.type == CritterType.Golden) ? Color.yellow : Color.cyan;
                string comboPraise = currentCombo > 1 ? string.Format("+{0} x{1}!", awarded, currentCombo) : string.Format("+{0}", awarded);
                SpawnFloatingFeedback(comboPraise, holePositions[holeIdx], popCol);
                SpawnStars(holePositions[holeIdx], popCol);

                CheckVictoryConditions();
            }
        }
        else
        {
            // Empty hole struck
            currentCombo = 0;
            PlayTone(220f, 0.08f, "sine");
        }
    }

    private void UpdateMalletPositionAndSwing()
    {
        if (malletRootGo != null)
        {
            if (isSwinging)
            {
                swingProgress += Time.deltaTime * 8.5f;

                // Slam down and rebound
                float swingAngle = Mathf.Sin(swingProgress * Mathf.PI) * 55f;
                float swingDropY = Mathf.Sin(swingProgress * Mathf.PI) * 1.4f;

                malletRootGo.transform.position = targetMalletPos - new Vector3(0f, swingDropY, 0f);
                malletRootGo.transform.rotation = Quaternion.Euler(swingAngle, 0f, 0f);

                if (swingProgress >= 1.0f)
                {
                    isSwinging = false;
                    malletRootGo.transform.rotation = Quaternion.identity;
                }
            }
            else
            {
                malletRootGo.transform.position = Vector3.Lerp(malletRootGo.transform.position, targetMalletPos, Time.deltaTime * 18f);
                malletRootGo.transform.rotation = Quaternion.identity;
            }
        }
    }

    private float spawnCooldown = 1.0f;

    private void UpdateMoleSpawnsAndLifecycles()
    {
        if (state != GameState.Playing) return;

        StageDef stage = stages[currentStageIdx];

        // Spawn timer
        spawnCooldown -= Time.deltaTime;
        if (spawnCooldown <= 0f)
        {
            spawnCooldown = stage.spawnInterval;
            TrySpawnRandomMole(stage);
        }

        // Update active critters
        for (int i = 0; i < activeCritters.Length; i++)
        {
            MoleCritter c = activeCritters[i];
            if (c != null)
            {
                if (!c.isRetreating)
                {
                    // Popping up
                    c.currentY = Mathf.MoveTowards(c.currentY, 0.85f, Time.deltaTime * 6.5f * stage.moleSpeed);
                    c.popTimer += Time.deltaTime;

                    if (c.popTimer >= c.maxStayDuration)
                    {
                        c.isRetreating = true;
                    }
                }
                else
                {
                    // Retreating into hole
                    c.currentY = Mathf.MoveTowards(c.currentY, -0.9f, Time.deltaTime * 8.5f);

                    if (c.currentY <= -0.85f)
                    {
                        // Gone
                        Destroy(c.rootGo);
                        activeCritters[i] = null;
                    }
                }

                if (c.rootGo != null)
                {
                    c.rootGo.transform.position = new Vector3(holePositions[i].x, c.currentY, holePositions[i].z);
                }
            }
        }
    }

    private void TrySpawnRandomMole(StageDef stage)
    {
        // Find empty hole
        List<int> emptyHoles = new List<int>();
        for (int i = 0; i < activeCritters.Length; i++)
        {
            if (activeCritters[i] == null) emptyHoles.Add(i);
        }

        if (emptyHoles.Count == 0) return;

        int chosenHole = emptyHoles[UnityEngine.Random.Range(0, emptyHoles.Count)];

        // Decide critter type
        CritterType type = CritterType.Normal;
        float roll = UnityEngine.Random.value;

        if (stage.hasBoss && roll < 0.12f) type = CritterType.KingBoss;
        else if (stage.allowBombs && roll < 0.28f) type = CritterType.Bomb;
        else if (stage.allowHardHat && roll < 0.45f) type = CritterType.HardHat;
        else if (roll < 0.65f) type = CritterType.Golden;

        var critter = new MoleCritter();
        critter.holeIndex = chosenHole;
        critter.type = type;
        critter.currentY = -0.9f;
        critter.targetY = 0.85f;
        critter.popTimer = 0f;
        critter.maxStayDuration = (type == CritterType.KingBoss) ? 3.0f : UnityEngine.Random.Range(1.1f, 1.8f) / stage.moleSpeed;
        critter.hp = (type == CritterType.KingBoss) ? 5 : (type == CritterType.HardHat) ? 2 : 1;
        critter.maxHp = critter.hp;

        // Model Creation
        var root = new GameObject("Critter_" + type);
        root.transform.position = new Vector3(holePositions[chosenHole].x, critter.currentY, holePositions[chosenHole].z);
        critter.rootGo = root;

        // Painted critter sprite (the table hides whatever is still below the felt)
        var head = ArtQuad("Body");
        head.transform.SetParent(root.transform, false);
        head.transform.localPosition = new Vector3(0f, 0.55f, 0f);
        head.transform.rotation = FaceCam;
        float size = (type == CritterType.KingBoss) ? 2.0f : 1.6f;
        head.transform.localScale = new Vector3(size, size, 1f);
        head.GetComponent<Renderer>().material = SpriteMat("critter_" + type, Color.white, 3000);
        critter.headGo = head;

        activeCritters[chosenHole] = critter;
    }

    private void SpawnStars(Vector3 pos, Color color)
    {
        for (int i = 0; i < 6; i++)
        {
            var s = new StarParticle();
            s.pos = pos + Vector3.up * 0.5f;
            s.vel = new Vector3(UnityEngine.Random.Range(-3.5f, 3.5f), UnityEngine.Random.Range(2f, 5.5f), UnityEngine.Random.Range(-3.5f, 3.5f));
            s.color = color;
            s.scale = UnityEngine.Random.Range(0.2f, 0.35f);

            var go = ArtQuad("Star");
            go.transform.position = s.pos;
            go.transform.rotation = FaceCam * Quaternion.Euler(0f, 0f, UnityEngine.Random.Range(0f, 72f));
            go.transform.localScale = Vector3.one * s.scale * 1.6f;
            go.GetComponent<Renderer>().material = SpriteMat("star", color, 3100);
            s.go = go;

            activeStars.Add(s);
        }
    }

    private void UpdateStarParticles()
    {
        for (int i = activeStars.Count - 1; i >= 0; i--)
        {
            StarParticle s = activeStars[i];
            s.life += Time.deltaTime;
            s.pos += s.vel * Time.deltaTime;
            s.vel.y -= 9.8f * Time.deltaTime;

            if (s.go != null)
            {
                s.go.transform.position = s.pos;
                s.go.transform.localScale = Vector3.one * (s.scale * 1.6f * (1f - s.life / s.maxLife));
            }

            if (s.life >= s.maxLife)
            {
                if (s.go != null) Destroy(s.go);
                activeStars.RemoveAt(i);
            }
        }
    }

    private void SpawnFloatingFeedback(string text, Vector3 pos, Color color)
    {
        var fb = new FloatingFeedback();
        fb.text = text;
        fb.pos = pos + Vector3.up * 0.8f;
        fb.color = color;
        floatingTexts.Add(fb);
    }

    private void UpdateFloatingFeedbacks()
    {
        for (int i = floatingTexts.Count - 1; i >= 0; i--)
        {
            FloatingFeedback fb = floatingTexts[i];
            fb.timer += Time.deltaTime;
            fb.pos += Vector3.up * 1.5f * Time.deltaTime;

            if (fb.timer >= fb.duration)
            {
                floatingTexts.RemoveAt(i);
            }
        }
    }

    private void UpdateCameraTrauma()
    {
        if (shakeTrauma > 0f)
        {
            mainCam.transform.position = new Vector3(UnityEngine.Random.Range(-shakeTrauma, shakeTrauma), 11.5f + UnityEngine.Random.Range(-shakeTrauma, shakeTrauma), -8.2f);
            shakeTrauma = Mathf.Max(0f, shakeTrauma - Time.deltaTime * 1.8f);
        }
    }

    private void CheckVictoryConditions()
    {
        if (isEndlessMode) return;

        StageDef stage = stages[currentStageIdx];
        if (score >= stage.targetScore)
        {
            state = GameState.Victory;
            PlayFanfare();
        }
    }

    private void CheckRoundEnd()
    {
        StageDef stage = stages[currentStageIdx];
        if (score >= stage.targetScore)
        {
            state = GameState.Victory;
            PlayFanfare();
        }
        else
        {
            state = GameState.GameOver;
            PlayTone(160f, 0.6f, "square");
        }
    }

    private void PlayFanfare()
    {
        StartCoroutine(FanfareRoutine());
    }

    private IEnumerator FanfareRoutine()
    {
        float[] notes = { 392.00f, 523.25f, 659.25f, 783.99f };
        foreach (var n in notes)
        {
            PlayTone(n, 0.25f, "triangle");
            yield return new WaitForSeconds(0.12f);
        }
    }

    // GUI HUD & Modals
    private void OnGUI()
    {
        OiyoUiFont.Apply();
        GUI.skin.label.fontSize = 15;
        GUI.skin.button.fontSize = 14;

        // Top Navigation Bar
        GUILayout.BeginArea(new Rect(16, 14, Screen.width - 32, 60));
        GUILayout.BeginHorizontal();

        StageDef def = stages[currentStageIdx];
        string title = isEndlessMode ? (U("Endless Mode")) : def.name.Get(currentLang);
        GUILayout.Label(string.Format("<b><color=#00f0ff>{0}</color></b>", title), GUILayout.Width(280));

        // Score
        string scoreLabel = U("Score");
        string goalLabel = U("Goal");
        GUILayout.Label(string.Format("🔨 {0}: <b><color=#ffd700>{1}</color></b> ({2}: {3})", scoreLabel, score, goalLabel, def.targetScore), GUILayout.Width(240));

        // Combo & Timer
        if (currentCombo > 1)
        {
            GUILayout.Label("🔥 " + F("COMBO x{0}!", currentCombo), GUILayout.Width(110));
        }

        string timeStr = isEndlessMode ? "∞" : string.Format("⏱️ {0:F0}s", roundTimeRemaining);
        GUILayout.Label(timeStr, GUILayout.Width(90));

        GUILayout.FlexibleSpace();

        // Stage Select Button
        string stageBtn = U("📑 Stages");
        if (GUILayout.Button(stageBtn, GUILayout.Width(110), GUILayout.Height(34)))
        {
            showStageSelect = !showStageSelect;
        }

        // Language Switcher
        string langBtn = string.Format("🌐 {0}", currentLang);
        if (GUILayout.Button(langBtn, GUILayout.Width(88), GUILayout.Height(34)))
        {
            currentLang = (Language)(((int)currentLang + 1) % 4);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Floating In-Game Feedbacks
        foreach (var fb in floatingTexts)
        {
            Vector3 sPos = mainCam.WorldToScreenPoint(fb.pos);
            if (sPos.z > 0f)
            {
                Rect r = new Rect(sPos.x - 140, Screen.height - sPos.y - 25, 280, 45);
                GUI.color = fb.color;
                GUI.skin.label.alignment = TextAnchor.MiddleCenter;
                GUI.skin.label.fontSize = 20;
                GUI.Label(r, string.Format("<b>{0}</b>", fb.text));
                GUI.skin.label.alignment = TextAnchor.UpperLeft;
                GUI.color = Color.white;
            }
        }

        // Stage Select Modal
        if (showStageSelect)
        {
            RenderStageSelectModal();
        }

        // Game Over Modal
        if (state == GameState.GameOver)
        {
            RenderGameOverModal();
        }

        // Victory Modal
        if (state == GameState.Victory)
        {
            RenderVictoryModal();
        }
    }

    private void RenderStageSelectModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 240, Screen.height * 0.5f - 230, 480, 460), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 220, Screen.height * 0.5f - 210, 440, 420));

        string mapHeader = U("<b><color=#00f0ff>Select Stage (30 Stages)</color></b>");
        GUILayout.Label(mapHeader, GUILayout.Height(30));

        // 4 columns, scrolling for all 30 stages
        var cellStyle = new GUIStyle(GUI.skin.button) { wordWrap = true, fontSize = 11 };
        stageSelectScroll = GUILayout.BeginScrollView(stageSelectScroll, GUILayout.Height(250));
        for (int i = 0; i < stages.Count; i++)
        {
            if (i % 4 == 0) GUILayout.BeginHorizontal();

            StageDef s = stages[i];
            string btnLabel = string.Format("#{0} {1}", s.stageNum, s.name.Get(currentLang).Split(':', '：')[1].Trim());
            if (GUILayout.Button(btnLabel, cellStyle, GUILayout.Width(98), GUILayout.Height(60)))
            {
                isEndlessMode = false;
                LoadStage(i);
            }

            if (i % 4 == 3 || i == stages.Count - 1) GUILayout.EndHorizontal();
        }
        GUILayout.EndScrollView();

        GUILayout.Space(8);

        // Endless Mode Toggle
        string endlessTxt = isEndlessMode ? (U("★ Playing Endless Mode ★")) : (U("Switch to Endless Mode"));
        if (GUILayout.Button(endlessTxt, GUILayout.Height(38)))
        {
            isEndlessMode = true;
            LoadStage(0);
        }

        if (GUILayout.Button(U("Close"), GUILayout.Height(36)))
        {
            showStageSelect = false;
        }

        GUILayout.EndArea();
    }

    private void RenderGameOverModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 190, Screen.height * 0.5f - 140, 380, 280), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 170, Screen.height * 0.5f - 120, 340, 240));

        GUILayout.Label("<b><color=#ef4444>" + U("TIME'S UP! GAME OVER") + "</color></b>", GUILayout.Height(30));
        GUILayout.Label(U("Score") + string.Format(": <b><color=#ffd700>{0}</color></b>", score));
        GUILayout.Label(U("Moles Whacked") + string.Format(": <b><color=#38bdf8>{0}</color></b>", molesWhacked));
        GUILayout.Label(U("Max Combo") + string.Format(": <b><color=#f59e0b>{0}</color></b>", maxComboAchieved));

        GUILayout.Space(12);

        string retryTxt = U("Retry");
        if (GUILayout.Button(retryTxt, GUILayout.Height(40)))
        {
            LoadStage(currentStageIdx);
        }

        string stageTxt = U("Stage Select");
        if (GUILayout.Button(stageTxt, GUILayout.Height(36)))
        {
            showStageSelect = true;
        }

        GUILayout.EndArea();
    }

    private void RenderVictoryModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 190, Screen.height * 0.5f - 140, 380, 280), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 170, Screen.height * 0.5f - 120, 340, 240));

        GUILayout.Label("<b><color=#22c55e>★ " + U("STAGE CLEARED!") + " ★</color></b>", GUILayout.Height(30));
        GUILayout.Label(U("Final Score") + string.Format(": <b><color=#ffd700>{0}</color></b>", score));
        GUILayout.Label(U("Moles Whacked") + string.Format(": <b><color=#38bdf8>{0}</color></b>", molesWhacked));
        GUILayout.Label(U("Max Combo") + string.Format(": <b><color=#f59e0b>{0}</color></b>", maxComboAchieved));

        GUILayout.Space(12);

        if (currentStageIdx < stages.Count - 1)
        {
            string nextTxt = U("Next Stage →");
            if (GUILayout.Button(nextTxt, GUILayout.Height(42)))
            {
                LoadStage(currentStageIdx + 1);
            }
        }
        else
        {
            string masterTxt = U("★ All 30 Stages Mastered! ★");
            GUILayout.Label(masterTxt, GUILayout.Height(36));
        }

        string replayTxt = U("Replay Stage");
        if (GUILayout.Button(replayTxt, GUILayout.Height(36)))
        {
            LoadStage(currentStageIdx);
        }

        GUILayout.EndArea();
    }
}
