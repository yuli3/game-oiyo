using System.Collections.Generic;
using UnityEngine;

public sealed class BorderInspectorPlayer : MonoBehaviour
{
    // Page language for English UI text (scripts/unity/oiyo-i18n).
    static string U(string en) => OiyoI18n.Ui(en, OiyoI18n.Page);
    static string F(string en, params object[] args) => string.Format(OiyoI18n.Ui(en, OiyoI18n.Page), args);
    sealed class DeskDoc
    {
        public string Title;
        public string BodyText;
        public Vector3 Pos;
        public Vector2 Size;
        public GameObject Go;
        public bool IsPassport;
        public bool Stamped;
        public bool StampApproved;
        public GameObject StampMark;
    }

    struct ApplicantCase
    {
        public string Name;
        public string Country;
        public string Expiry;
        public bool HasSeal;
        public bool HasPermit;
        public string PermitName;
        public int PassWeight;
        public int BoothWeight;
        public string Purpose;
        public bool HasWorkPass;
        public bool HasVaccine;
        public bool IsWanted;
        public bool HasDiplomatSeal;
        public bool ShouldApprove;
        public string ViolationReason;
    }

    const int TotalStages = 30;
    readonly string[] _stageTitles =
    {
        "Day 1: Basic Passport Check",
        "Day 2: Expired Passports",
        "Day 3: Official District Seal",
        "Day 4: Entry Permits & Name Match",
        "Day 5: Scale Weight Biometrics",
        "Day 6: Zelkova Border Embargo",
        "Day 7: Worker Permits Required",
        "Day 8: Vaccine Certificates",
        "Day 9: Smuggler Weight Discrepancy",
        "Day 10: Most-Wanted Fugitive Check",
        "Day 11: Diplomatic Seal Verification",
        "Day 12: Grand Final Audit",
        "Day 13: Night Shift Rush",
        "Day 14: Holiday Crowds",
        "Day 15: Forged Seals",
        "Day 16: Border Tension",
        "Day 17: Smuggler Ring",
        "Day 18: Inspection Audit",
        "Day 19: Double Agents",
        "Day 20: Embassy Convoy",
        "Day 21: Winter Queue",
        "Day 22: Fugitive Network",
        "Day 23: Paper Storm",
        "Day 24: Ministry Visit",
        "Day 25: Midnight Raid",
        "Day 26: Trade Summit",
        "Day 27: Last Checkpoint",
        "Day 28: Shadow Ledger",
        "Day 29: Full Lockdown",
        "Day 30: Inspector of the Year"
    };

    Camera _cam;
    readonly List<DeskDoc> _docs = new List<DeskDoc>();
    readonly List<ApplicantCase> _queue = new List<ApplicantCase>();

    DeskDoc _dragged;
    Vector3 _dragOffset;
    Transform _boothVisitor;
    Transform _approveStampArm;
    Transform _denyStampArm;

    int _stage = 1;
    int _highestUnlocked = TotalStages; // Allow direct access or progression across all stages
    int _caseIdx;
    int _credits = 20;
    int _citations;
    const int MaxCitations = 3;
    float _shiftTimer;
    float _shiftDuration = 75f;
    float _stampThudTimer;
    float _shakeTimer;
    bool _showStageMap;
    bool _stageComplete;
    bool _stageFailed;
    string _feedback = U("Drag documents across the desk, then click APPROVE or DENY stamp!");
    float _feedbackTimer = 4f;

    Material _deskMat;
    Material _boothWallMat;
    Material _passportMat;
    Material _permitMat;
    Material _cardMat;
    Material _ruleMat;
    Material _approveMat;
    Material _denyMat;
    Material _visitorMat;
    readonly Dictionary<Material, Material> _docFaces = new Dictionary<Material, Material>();

    // ---- Painted art (scripts/make_art.py -> Resources/BI/Art) ----
    static Texture2D ArtTex(string name)
    {
        var t = Resources.Load<Texture2D>("BI/Art/" + name);
        if (t != null) t.wrapMode = TextureWrapMode.Clamp;
        return t;
    }

    static Material TexturedLit(string tex)
    {
        var m = MakeMat(Color.white);
        m.mainTexture = ArtTex(tex);
        if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", 0.12f);
        return m;
    }

    // A flat painted face lying on top of a box (child quad facing up).
    static GameObject TopFace(Transform parent, Material mat, float lift)
    {
        var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
        q.name = "Face";
        Destroy(q.GetComponent<Collider>());
        q.transform.SetParent(parent, false);
        q.transform.localPosition = new Vector3(0f, lift, 0f);
        q.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        q.transform.localScale = Vector3.one;
        q.GetComponent<Renderer>().material = mat;
        return q;
    }

    void Start()
    {
        Application.targetFrameRate = 60;
        CreateMaterials();
        SetupCameraAndLight();
        BuildBoothEnvironment();
        StartStage(1);
    }

    static Material MakeMat(Color c)
    {
        var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard") ?? Shader.Find("Unlit/Color");
        var m = new Material(OiyoShaders.Safe(shader));
        m.color = c;
        return m;
    }

    void CreateMaterials()
    {
        _deskMat = MakeMat(new Color(0.32f, 0.24f, 0.18f));
        _boothWallMat = MakeMat(new Color(0.22f, 0.24f, 0.26f));
        _passportMat = MakeMat(new Color(0.46f, 0.18f, 0.20f));
        _permitMat = MakeMat(new Color(0.84f, 0.86f, 0.78f));
        _cardMat = MakeMat(new Color(0.76f, 0.84f, 0.90f));
        _ruleMat = MakeMat(new Color(0.82f, 0.72f, 0.46f));
        _approveMat = MakeMat(new Color(0.18f, 0.74f, 0.36f));
        _denyMat = MakeMat(new Color(0.86f, 0.20f, 0.22f));
        var cut = Shader.Find("OIYO/UnlitCutout");
        _visitorMat = new Material(cut != null ? cut : Shader.Find("Sprites/Default"));
        _visitorMat.mainTexture = ArtTex("visitor0");
        _docFaces[_passportMat] = TexturedLit("doc_passport");
        _docFaces[_permitMat] = TexturedLit("doc_permit");
        _docFaces[_cardMat] = TexturedLit("doc_card");
        _docFaces[_ruleMat] = TexturedLit("doc_rules");
    }

    void SetupCameraAndLight()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        _cam = camGo.AddComponent<Camera>();
        _cam.clearFlags = CameraClearFlags.SolidColor;
        _cam.backgroundColor = new Color(0.11f, 0.12f, 0.14f);
        _cam.fieldOfView = 44f;
        camGo.transform.position = new Vector3(0f, 12.2f, -6.4f);
        camGo.transform.rotation = Quaternion.Euler(63f, 0f, 0f);

        var sunGo = new GameObject("DeskLamp");
        var l = sunGo.AddComponent<Light>();
        l.type = LightType.Directional;
        l.intensity = 1.25f;
        l.color = new Color(1.0f, 0.95f, 0.86f);
        sunGo.transform.rotation = Quaternion.Euler(55f, -20f, 0f);
    }

    void BuildBoothEnvironment()
    {
        var desk = GameObject.CreatePrimitive(PrimitiveType.Cube);
        desk.transform.position = new Vector3(0f, -0.5f, -0.5f);
        desk.transform.localScale = new Vector3(17f, 1f, 10.5f);
        desk.GetComponent<Renderer>().material = _deskMat;
        TopFace(desk.transform, TexturedLit("desk_top"), 0.501f);

        var backWall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        backWall.transform.position = new Vector3(0f, 1.8f, 4.6f);
        backWall.transform.localScale = new Vector3(17f, 4.2f, 0.4f);
        backWall.GetComponent<Renderer>().material = TexturedLit("wall");

        // Traveller at the window: a painted portrait facing the camera
        var visitorGo = GameObject.CreatePrimitive(PrimitiveType.Quad);
        visitorGo.name = "Traveller";
        Destroy(visitorGo.GetComponent<Collider>());
        _boothVisitor = visitorGo.transform;
        _boothVisitor.position = new Vector3(-3.4f, 1.35f, 3.25f);
        _boothVisitor.rotation = _cam.transform.rotation;
        _boothVisitor.localScale = new Vector3(2.2f, 2.75f, 1f);
        visitorGo.GetComponent<Renderer>().material = _visitorMat;

        // Rubber Stamp Rack on right side of desk
        var approveBase = GameObject.CreatePrimitive(PrimitiveType.Cube);
        approveBase.transform.position = new Vector3(6.4f, 0.25f, 1.3f);
        approveBase.transform.localScale = new Vector3(1.8f, 0.45f, 1.2f);
        approveBase.GetComponent<Renderer>().material = _approveMat;
        TopFace(approveBase.transform, TexturedLit("stamp_approve"), 0.502f);
        _approveStampArm = approveBase.transform;

        var denyBase = GameObject.CreatePrimitive(PrimitiveType.Cube);
        denyBase.transform.position = new Vector3(6.4f, 0.25f, -0.6f);
        denyBase.transform.localScale = new Vector3(1.8f, 0.45f, 1.2f);
        denyBase.GetComponent<Renderer>().material = _denyMat;
        TopFace(denyBase.transform, TexturedLit("stamp_deny"), 0.502f);
        _denyStampArm = denyBase.transform;
    }

    void StartStage(int stageNum)
    {
        _stage = Mathf.Clamp(stageNum, 1, TotalStages);
        _caseIdx = 0;
        _citations = 0;
        _shiftDuration = Mathf.Max(55f, 90f - _stage * 2.5f);
        // Past day 12 the queue keeps growing and each applicant gets a little less time
        // (stage 12: 6 applicants in 60 s; stage 30: 11 applicants at 6.4 s each).
        if (_stage > 12) _shiftDuration = QueueSize(_stage) * (10f - (_stage - 12) * 0.2f);
        _shiftTimer = _shiftDuration;
        _stageComplete = false;
        _stageFailed = false;
        _showStageMap = false;

        BuildQueueForStage(_stage);
        LoadCurrentApplicantDocs();
        SetFeedback(F("Stage {0}/{1} Started: {2}", _stage, TotalStages, U(_stageTitles[_stage - 1])));
    }

    static int QueueSize(int st) => 4 + (st >= 6 ? 1 : 0) + (st >= 10 ? 1 : 0) + (st > 12 ? (st - 10) / 4 : 0);

    void BuildQueueForStage(int st)
    {
        _queue.Clear();
        int count = QueueSize(st);
        string[] firstNames = { "Viktor", "Elena", "Marek", "Olga", "Ivan", "Sora", "Dmitri", "Kira" };
        string[] countries = { "Velmora", "Oskaria", "Tarnhold", "Merivale", "Zelkova" };
        string[] purposes = { "TRANSIT", "WORK", "VISIT", "DIPLOMAT" };

        for (int i = 0; i < count; i++)
        {
            string name = firstNames[(st * 3 + i * 5) % firstNames.Length] + " K.";
            string country = countries[(i + st) % (st >= 6 ? 5 : 4)];
            bool makeInvalid = (i % 2 == 1) || (i == count - 1);
            string expiry = "2028-04-12";
            bool seal = true;
            bool hasPermit = st >= 4;
            string permitName = name;
            int passW = 68 + (i * 4);
            int boothW = passW;
            string purpose = st >= 7 && i % 2 == 0 ? "WORK" : purposes[i % 3];
            if (st >= 11 && i == 1) purpose = "DIPLOMAT";
            bool hasWorkPass = st >= 7 && purpose == "WORK";
            bool hasVaccine = st >= 8;
            bool isWanted = false;
            bool hasDiplo = st >= 11 && purpose == "DIPLOMAT";
            string reason = "";

            if (makeInvalid)
            {
                int rulePick = Random.Range(0, Mathf.Min(st, 11));
                if (st >= 10 && i == count - 1)
                {
                    name = "Oren Vasko";
                    isWanted = true;
                    reason = U("Fugitive on Most-Wanted Poster!");
                }
                else if (st >= 6 && country == "Zelkova")
                {
                    reason = U("Zelkova nationals banned!");
                }
                else if (rulePick == 1 || st == 2)
                {
                    expiry = "2024-09-01";
                    reason = U("Expired Passport!");
                }
                else if (rulePick == 2 || st == 3)
                {
                    seal = false;
                    reason = U("Missing District Stamp Seal!");
                }
                else if ((rulePick == 3 || st == 4) && st >= 4)
                {
                    permitName = "Fake Alias";
                    reason = U("Name mismatch on Entry Permit!");
                }
                else if ((rulePick == 4 || st == 5 || st == 8) && st >= 5)
                {
                    boothW = passW + (st >= 9 ? 14 : 9);
                    reason = st >= 9 ? U("Weight Discrepancy (+Smuggler Contraband)!") : U("Booth scale weight mismatch!");
                }
                else if (st >= 7 && purpose == "WORK")
                {
                    hasWorkPass = false;
                    reason = U("Missing Work Pass for WORK purpose!");
                }
                else if (st >= 8)
                {
                    hasVaccine = false;
                    reason = U("Missing Polio Vaccine Certificate!");
                }
                else if (st >= 11 && purpose == "DIPLOMAT")
                {
                    hasDiplo = false;
                    reason = U("Invalid Diplomatic Seal!");
                }
                else
                {
                    expiry = "2023-11-10";
                    reason = U("Expired Passport!");
                }
            }
            else
            {
                if (st >= 6 && country == "Zelkova") country = "Velmora";
            }

            _queue.Add(new ApplicantCase
            {
                Name = name,
                Country = country,
                Expiry = expiry,
                HasSeal = seal,
                HasPermit = hasPermit,
                PermitName = permitName,
                PassWeight = passW,
                BoothWeight = boothW,
                Purpose = purpose,
                HasWorkPass = hasWorkPass,
                HasVaccine = hasVaccine,
                IsWanted = isWanted,
                HasDiplomatSeal = hasDiplo,
                ShouldApprove = !makeInvalid,
                ViolationReason = reason
            });
        }
    }

    void LoadCurrentApplicantDocs()
    {
        for (int i = 0; i < _docs.Count; i++)
        {
            if (_docs[i].Go != null) Destroy(_docs[i].Go);
        }
        _docs.Clear();
        _dragged = null;

        if (_caseIdx >= _queue.Count)
        {
            _stageComplete = true;
            _highestUnlocked = Mathf.Max(_highestUnlocked, Mathf.Min(TotalStages, _stage + 1));
            _credits += 25 + _stage * 5;
            return;
        }

        var c = _queue[_caseIdx];
        // a different traveller steps up for each case
        _visitorMat.mainTexture = ArtTex("visitor" + (_caseIdx + _stage) % 5);
        // Rulebook Card on Left
        SpawnDoc("RULES (Stage " + _stage + ")",
            StageRuleSummary(_stage) + ( _stage >= 10 ? U("\nWANTED: Oren Vasko") : ""),
            new Vector3(-5.0f, 0.12f, -1.0f), new Vector2(2.6f, 3.2f), _ruleMat, false);

        // Passport in Center
        SpawnDoc("PASSPORT",
            F("Name: {0}\nNation: {1}\nExp: {2}\nWeight: {3}kg\nSeal: {4}", c.Name, c.Country, c.Expiry, c.PassWeight, c.HasSeal ? U("VALID") : U("MISSING")),
            new Vector3(-1.4f, 0.14f, 0.4f), new Vector2(2.3f, 2.8f), _passportMat, true);

        if (c.HasPermit)
        {
            SpawnDoc("ENTRY PERMIT",
                F("Holder: {0}\nPurpose: {1}\nAuthorized Entry", c.PermitName, c.Purpose),
                new Vector3(1.5f, 0.16f, 0.7f), new Vector2(2.2f, 2.6f), _permitMat, false);
        }

        if (c.HasWorkPass || c.HasVaccine || c.HasDiplomatSeal)
        {
            string extra = c.HasWorkPass ? U("WORK PASS: Validated") : (c.HasVaccine ? U("POLIO VAX: Cleared") : U("DIPLO SEAL: Active"));
            SpawnDoc("SUPPLEMENT",
                F("Holder: {0}\n{1}\nScale Wt: {2}kg", c.Name, extra, c.BoothWeight),
                new Vector3(1.6f, 0.18f, -2.1f), new Vector2(2.2f, 2.0f), _cardMat, false);
        }
    }

    string StageRuleSummary(int st)
    {
        var sb = "Today's Rules:\n• Date: 2026-11-14\n";
        if (st >= 2) sb += "• No Expired Docs\n";
        if (st >= 3) sb += "• Valid Seal Required\n";
        if (st >= 4) sb += "• Match Permit Name\n";
        if (st >= 5) sb += "• Match Booth Scale\n";
        if (st >= 6) sb += "• Deny Zelkova!\n";
        if (st >= 7) sb += "• Work Needs WorkPass\n";
        if (st >= 8) sb += "• Vaccine Required\n";
        if (st >= 10) sb += "• Arrest Wanted Poster\n";
        return sb;
    }

    void SpawnDoc(string title, string body, Vector3 pos, Vector2 size, Material mat, bool isPassport)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = title;
        go.transform.position = pos;
        go.transform.localScale = new Vector3(size.x, 0.08f, size.y);
        go.GetComponent<Renderer>().material = mat;
        if (_docFaces.TryGetValue(mat, out var face)) TopFace(go.transform, face, 0.51f);
        _docs.Add(new DeskDoc
        {
            Title = title,
            BodyText = body,
            Pos = pos,
            Size = size,
            Go = go,
            IsPassport = isPassport
        });
    }

    void SetFeedback(string msg)
    {
        _feedback = msg;
        _feedbackTimer = 3.5f;
    }

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.TrackEnded("border-inspector", _stageComplete || _stageFailed, _stageComplete, 0);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (_feedbackTimer > 0f) _feedbackTimer -= dt;
        _stampThudTimer = Mathf.Max(0f, _stampThudTimer - dt);
        _shakeTimer = Mathf.Max(0f, _shakeTimer - dt);

        if (_approveStampArm != null)
        {
            _approveStampArm.position = Vector3.Lerp(_approveStampArm.position, new Vector3(6.4f, _stampThudTimer > 0f ? 0.45f : 0.25f, 1.3f), dt * 12f);
        }

        if (_stageComplete || _stageFailed || _showStageMap)
        {
            if (Input.GetKeyDown(KeyCode.R)) StartStage(_stage);
            return;
        }

        _shiftTimer -= dt;
        if (_shiftTimer <= 0f)
        {
            _stageFailed = true;
            SetFeedback(U("Shift timed out before processing all entrants!"));
            return;
        }

        if (Input.GetKeyDown(KeyCode.A)) ApplyDecision(true);
        if (Input.GetKeyDown(KeyCode.D)) ApplyDecision(false);

        HandlePointer(dt);
        UpdateCamera(dt);
    }

    void HandlePointer(float dt)
    {
        var ray = _cam.ScreenPointToRay(Input.mousePosition);
        if (!new Plane(Vector3.up, Vector3.zero).Raycast(ray, out float enter)) return;
        Vector3 hit = ray.GetPoint(enter);

        if (Input.GetMouseButtonDown(0) && Input.mousePosition.y < Screen.height - 85f)
        {
            // Check rubber stamps on desk
            if (Vector2.Distance(new Vector2(hit.x, hit.z), new Vector2(6.4f, 1.3f)) < 1.3f)
            {
                ApplyDecision(true);
                return;
            }
            if (Vector2.Distance(new Vector2(hit.x, hit.z), new Vector2(6.4f, -0.6f)) < 1.3f)
            {
                ApplyDecision(false);
                return;
            }

            // Pick topmost desk document
            for (int i = _docs.Count - 1; i >= 0; i--)
            {
                var d = _docs[i];
                if (Mathf.Abs(hit.x - d.Pos.x) <= d.Size.x * 0.55f && Mathf.Abs(hit.z - d.Pos.z) <= d.Size.y * 0.55f)
                {
                    _dragged = d;
                    _dragOffset = d.Pos - hit;
                    _dragOffset.y = 0f;
                    // Bring to front
                    _docs.RemoveAt(i);
                    _docs.Add(d);
                    break;
                }
            }
        }
        else if (Input.GetMouseButton(0) && _dragged != null)
        {
            Vector3 nxt = hit + _dragOffset;
            _dragged.Pos = new Vector3(Mathf.Clamp(nxt.x, -6.5f, 4.2f), 0.45f, Mathf.Clamp(nxt.z, -3.8f, 2.8f));
            _dragged.Go.transform.position = _dragged.Pos;
        }
        else if (Input.GetMouseButtonUp(0) && _dragged != null)
        {
            _dragged.Pos.y = 0.14f + (_docs.Count * 0.01f);
            _dragged.Go.transform.position = _dragged.Pos;
            _dragged = null;
        }
    }

    void ApplyDecision(bool approve)
    {
        if (_caseIdx >= _queue.Count || _stageComplete || _stageFailed) return;
        var c = _queue[_caseIdx];
        _stampThudTimer = 0.25f;
        _shakeTimer = 0.15f;

        if (approve == c.ShouldApprove)
        {
            _credits += 10;
            SetFeedback(approve ? F("APPROVED {0} (+10c)", c.Name) : F("DENIED {0} (+10c): {1}", c.Name, U(c.ViolationReason)));
        }
        else
        {
            _citations++;
            SetFeedback(F("CITATION! Wrong call on {0}: {1}", c.Name, string.IsNullOrEmpty(c.ViolationReason) ? U("Valid documents!") : U(c.ViolationReason)));
            if (_citations >= MaxCitations)
            {
                _stageFailed = true;
                return;
            }
        }

        _caseIdx++;
        LoadCurrentApplicantDocs();
    }

    void UpdateCamera(float dt)
    {
        Vector3 desired = new Vector3(0f, 12.2f, -6.4f);
        if (_shakeTimer > 0f) desired += Random.insideUnitSphere * 0.16f;
        _cam.transform.position = Vector3.Lerp(_cam.transform.position, desired, dt * 10f);
    }

    void OnGUI()
    {
        OiyoUiFont.Apply();
        var bold = new GUIStyle(GUI.skin.box) { fontSize = 14, fontStyle = FontStyle.Bold };
        GUI.Box(new Rect(14, 10, Screen.width - 28, 60), "");
        GUI.Label(new Rect(26, 16, 620, 24),
            F("BORDER INSPECTOR UNITY  |  STAGE {0}/{1} ({2})", _stage, TotalStages, U(_stageTitles[_stage - 1])), bold);
        GUI.Label(new Rect(26, 40, 620, 20),
            F("Entrant {0}/{1}  •  Credits: {2}₵  •  Citations: {3}/{4}  •  Shift Left: {5}s", _caseIdx + 1, _queue.Count, _credits, _citations, MaxCitations, Mathf.CeilToInt(_shiftTimer)));

        if (GUI.Button(new Rect(Screen.width - 170, 18, 144, 38), _showStageMap ? U("Close Stages") : U("30 Stages Map")))
        {
            _showStageMap = !_showStageMap;
        }

        if (_showStageMap)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 300, 90, 600, 370), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 280, 100, 560, 26), U("SELECT BORDER SHIFT (STAGES 1 - 30)"), bold);
            var mapBtn = new GUIStyle(GUI.skin.button) { fontSize = 10, wordWrap = true };
            for (int i = 0; i < TotalStages; i++)
            {
                int col = i % 5;
                int row = i / 5;
                float bx = Screen.width * 0.5f - 285 + col * 114;
                float by = 134 + row * 53;
                if (GUI.Button(new Rect(bx, by, 108, 48), F("Stage {0}", i + 1) + "\n" + U(_stageTitles[i]), mapBtn))
                {
                    StartStage(i + 1);
                }
            }
            return;
        }

        // Document overlay text boxes tracking dragged 3D positions
        var docStyle = new GUIStyle(GUI.skin.box) { fontSize = 11, alignment = TextAnchor.UpperLeft };
        for (int i = 0; i < _docs.Count; i++)
        {
            var d = _docs[i];
            Vector3 sp = _cam.WorldToScreenPoint(d.Pos);
            if (sp.z <= 0f) continue;
            float sx = sp.x;
            float sy = Screen.height - sp.y;
            GUI.Box(new Rect(sx - 85, sy - 54, 170, 108), U(d.Title) + "\n" + d.BodyText, docStyle);
        }

        // Booth scale readout & Stamp buttons
        if (_caseIdx < _queue.Count)
        {
            var c = _queue[_caseIdx];
            GUI.Box(new Rect(18, 80, 230, 52), F("BOOTH SCALE: {0} kg\nTODAY: 2026-11-14", c.BoothWeight), bold);
        }

        if (GUI.Button(new Rect(Screen.width - 170, Screen.height - 110, 148, 42), U("APPROVE (A)")))
        {
            ApplyDecision(true);
        }
        if (GUI.Button(new Rect(Screen.width - 170, Screen.height - 60, 148, 42), U("DENY (D)")))
        {
            ApplyDecision(false);
        }

        if (_feedbackTimer > 0f)
        {
            GUI.Box(new Rect(18, Screen.height - 52, Screen.width - 210, 34), _feedback, bold);
        }

        if (_stageComplete || _stageFailed)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 180, Screen.height * 0.5f - 65, 360, 130), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 160, Screen.height * 0.5f - 48, 320, 28),
                _stageComplete ? F("STAGE {0} SHIFT CLEARED!", _stage) : F("STAGE {0} FAILED ({1} CITATIONS)", _stage, _citations), bold);
            GUI.Label(new Rect(Screen.width * 0.5f - 160, Screen.height * 0.5f - 20, 320, 24),
                F("Credits: {0}₵ • Stage {1}/{2}", _credits, _stage, TotalStages));

            if (_stageComplete && _stage < TotalStages)
            {
                if (GUI.Button(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f + 16, 140, 34), F("Next: Stage {0}", _stage + 1)))
                {
                    StartStage(_stage + 1);
                }
                if (GUI.Button(new Rect(Screen.width * 0.5f + 10, Screen.height * 0.5f + 16, 140, 34), U("Stage Select")))
                {
                    _showStageMap = true;
                }
            }
            else
            {
                if (GUI.Button(new Rect(Screen.width * 0.5f - 70, Screen.height * 0.5f + 16, 140, 34), U("Retry Shift (R)")))
                {
                    StartStage(_stage);
                }
            }
        }
    }
}
