using System.Collections.Generic;
using UnityEngine;

public sealed class BorderInspectorPlayer : MonoBehaviour
{
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

    const int TotalStages = 12;
    readonly string[] _stageTitles =
    {
        "Day 1: Basic Passport Check",
        "Day 2: Expired Passports",
        "Day 3: Official District Seal",
        "Day 4: Entry Permits & Name Match",
        "Day 5: Scale Weight Biometrics",
        "Day 6: Kolechia Border Embargo",
        "Day 7: Worker Permits Required",
        "Day 8: Vaccine Certificates",
        "Day 9: Smuggler Weight Discrepancy",
        "Day 10: Most-Wanted Fugitive Check",
        "Day 11: Diplomatic Seal Verification",
        "Day 12: Grand Final Audit"
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
    int _highestUnlocked = TotalStages; // Allow direct access or progression across all 12 stages
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
    string _feedback = "Drag documents across the desk, then click APPROVE or DENY stamp!";
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
        var m = new Material(shader);
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
        _visitorMat = MakeMat(new Color(0.68f, 0.70f, 0.72f));
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

        var backWall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        backWall.transform.position = new Vector3(0f, 1.8f, 4.6f);
        backWall.transform.localScale = new Vector3(17f, 4.2f, 0.4f);
        backWall.GetComponent<Renderer>().material = _boothWallMat;

        var visitorGo = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        _boothVisitor = visitorGo.transform;
        _boothVisitor.position = new Vector3(-5.2f, 1.4f, 3.3f);
        _boothVisitor.localScale = new Vector3(1.1f, 1.1f, 1.1f);
        visitorGo.GetComponent<Renderer>().material = _visitorMat;

        // Rubber Stamp Rack on right side of desk
        var approveBase = GameObject.CreatePrimitive(PrimitiveType.Cube);
        approveBase.transform.position = new Vector3(6.4f, 0.25f, 1.3f);
        approveBase.transform.localScale = new Vector3(1.8f, 0.45f, 1.2f);
        approveBase.GetComponent<Renderer>().material = _approveMat;
        _approveStampArm = approveBase.transform;

        var denyBase = GameObject.CreatePrimitive(PrimitiveType.Cube);
        denyBase.transform.position = new Vector3(6.4f, 0.25f, -0.6f);
        denyBase.transform.localScale = new Vector3(1.8f, 0.45f, 1.2f);
        denyBase.GetComponent<Renderer>().material = _denyMat;
        _denyStampArm = denyBase.transform;
    }

    void StartStage(int stageNum)
    {
        _stage = Mathf.Clamp(stageNum, 1, TotalStages);
        _caseIdx = 0;
        _citations = 0;
        _shiftDuration = Mathf.Max(55f, 90f - _stage * 2.5f);
        _shiftTimer = _shiftDuration;
        _stageComplete = false;
        _stageFailed = false;
        _showStageMap = false;

        BuildQueueForStage(_stage);
        LoadCurrentApplicantDocs();
        SetFeedback($"Stage {_stage}/12 Started: {_stageTitles[_stage - 1]}");
    }

    void BuildQueueForStage(int st)
    {
        _queue.Clear();
        int count = 4 + (st >= 6 ? 1 : 0) + (st >= 10 ? 1 : 0);
        string[] firstNames = { "Viktor", "Elena", "Marek", "Olga", "Ivan", "Sora", "Dmitri", "Kira" };
        string[] countries = { "Arstotzka", "Obristan", "Antegria", "Republia", "Kolechia" };
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
                    name = "Jorji Costava";
                    isWanted = true;
                    reason = "Fugitive on Most-Wanted Poster!";
                }
                else if (st >= 6 && country == "Kolechia")
                {
                    reason = "Kolechia nationals banned!";
                }
                else if (rulePick == 1 || st == 2)
                {
                    expiry = "2024-09-01";
                    reason = "Expired Passport!";
                }
                else if (rulePick == 2 || st == 3)
                {
                    seal = false;
                    reason = "Missing District Stamp Seal!";
                }
                else if ((rulePick == 3 || st == 4) && st >= 4)
                {
                    permitName = "Fake Alias";
                    reason = "Name mismatch on Entry Permit!";
                }
                else if ((rulePick == 4 || st == 5 || st == 8) && st >= 5)
                {
                    boothW = passW + (st >= 9 ? 14 : 9);
                    reason = st >= 9 ? "Weight Discrepancy (+Smuggler Contraband)!" : "Booth scale weight mismatch!";
                }
                else if (st >= 7 && purpose == "WORK")
                {
                    hasWorkPass = false;
                    reason = "Missing Work Pass for WORK purpose!";
                }
                else if (st >= 8)
                {
                    hasVaccine = false;
                    reason = "Missing Polio Vaccine Certificate!";
                }
                else if (st >= 11 && purpose == "DIPLOMAT")
                {
                    hasDiplo = false;
                    reason = "Invalid Diplomatic Seal!";
                }
                else
                {
                    expiry = "2023-11-10";
                    reason = "Expired Passport!";
                }
            }
            else
            {
                if (st >= 6 && country == "Kolechia") country = "Arstotzka";
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
        // Rulebook Card on Left
        SpawnDoc("RULES (Stage " + _stage + ")",
            StageRuleSummary(_stage) + ( _stage >= 10 ? "\nWANTED: Jorji Costava" : ""),
            new Vector3(-5.0f, 0.12f, -1.0f), new Vector2(2.6f, 3.2f), _ruleMat, false);

        // Passport in Center
        SpawnDoc("PASSPORT",
            $"Name: {c.Name}\nNation: {c.Country}\nExp: {c.Expiry}\nWeight: {c.PassWeight}kg\nSeal: {(c.HasSeal ? "VALID" : "MISSING")}",
            new Vector3(-1.4f, 0.14f, 0.4f), new Vector2(2.3f, 2.8f), _passportMat, true);

        if (c.HasPermit)
        {
            SpawnDoc("ENTRY PERMIT",
                $"Holder: {c.PermitName}\nPurpose: {c.Purpose}\nAuthorized Entry",
                new Vector3(1.5f, 0.16f, 0.7f), new Vector2(2.2f, 2.6f), _permitMat, false);
        }

        if (c.HasWorkPass || c.HasVaccine || c.HasDiplomatSeal)
        {
            string extra = c.HasWorkPass ? "WORK PASS: Validated" : (c.HasVaccine ? "POLIO VAX: Cleared" : "DIPLO SEAL: Active");
            SpawnDoc("SUPPLEMENT",
                $"Holder: {c.Name}\n{extra}\nScale Wt: {c.BoothWeight}kg",
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
        if (st >= 6) sb += "• Deny Kolechia!\n";
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
            SetFeedback("Shift timed out before processing all entrants!");
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
            SetFeedback(approve ? $"APPROVED {c.Name} (+10c)" : $"DENIED {c.Name} (+10c): {c.ViolationReason}");
        }
        else
        {
            _citations++;
            SetFeedback($"CITATION! Wrong call on {c.Name}: {(string.IsNullOrEmpty(c.ViolationReason) ? "Valid documents!" : c.ViolationReason)}");
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
        var bold = new GUIStyle(GUI.skin.box) { fontSize = 14, fontStyle = FontStyle.Bold };
        GUI.Box(new Rect(14, 10, Screen.width - 28, 60), "");
        GUI.Label(new Rect(26, 16, 620, 24),
            $"BORDER INSPECTOR UNITY  |  STAGE {_stage}/{TotalStages} ({_stageTitles[_stage - 1]})", bold);
        GUI.Label(new Rect(26, 40, 620, 20),
            $"Entrant {_caseIdx + 1}/{_queue.Count}  •  Credits: {_credits}₵  •  Citations: {_citations}/{MaxCitations}  •  Shift Left: {Mathf.CeilToInt(_shiftTimer)}s");

        if (GUI.Button(new Rect(Screen.width - 170, 18, 144, 38), _showStageMap ? "Close Stages" : "12 Stages Map"))
        {
            _showStageMap = !_showStageMap;
        }

        if (_showStageMap)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 280, 90, 560, 320), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 260, 100, 520, 26), "SELECT BORDER SHIFT (STAGES 1 - 12)", bold);
            for (int i = 0; i < TotalStages; i++)
            {
                int col = i % 3;
                int row = i / 3;
                float bx = Screen.width * 0.5f - 260 + col * 176;
                float by = 138 + row * 64;
                if (GUI.Button(new Rect(bx, by, 166, 54), $"Stage {i + 1}\n{_stageTitles[i].Replace($"Day {i + 1}: ", "")}"))
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
            GUI.Box(new Rect(sx - 85, sy - 54, 170, 108), $"{d.Title}\n{d.BodyText}", docStyle);
        }

        // Booth scale readout & Stamp buttons
        if (_caseIdx < _queue.Count)
        {
            var c = _queue[_caseIdx];
            GUI.Box(new Rect(18, 80, 230, 52), $"BOOTH SCALE: {c.BoothWeight} kg\nTODAY: 2026-11-14", bold);
        }

        if (GUI.Button(new Rect(Screen.width - 170, Screen.height - 110, 148, 42), "APPROVE (A)"))
        {
            ApplyDecision(true);
        }
        if (GUI.Button(new Rect(Screen.width - 170, Screen.height - 60, 148, 42), "DENY (D)"))
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
                _stageComplete ? $"STAGE {_stage} SHIFT CLEARED!" : $"STAGE {_stage} FAILED ({_citations} CITATIONS)", bold);
            GUI.Label(new Rect(Screen.width * 0.5f - 160, Screen.height * 0.5f - 20, 320, 24),
                $"Credits: {_credits}₵ • Stage {_stage}/{TotalStages}");

            if (_stageComplete && _stage < TotalStages)
            {
                if (GUI.Button(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f + 16, 140, 34), $"Next: Stage {_stage + 1}"))
                {
                    StartStage(_stage + 1);
                }
                if (GUI.Button(new Rect(Screen.width * 0.5f + 10, Screen.height * 0.5f + 16, 140, 34), "Stage Select"))
                {
                    _showStageMap = true;
                }
            }
            else
            {
                if (GUI.Button(new Rect(Screen.width * 0.5f - 70, Screen.height * 0.5f + 16, 140, 34), "Retry Shift (R)"))
                {
                    StartStage(_stage);
                }
            }
        }
    }
}
