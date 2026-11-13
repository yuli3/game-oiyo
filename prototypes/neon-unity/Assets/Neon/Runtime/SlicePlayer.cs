// PROTOTYPE ONLY — placeholder graphics and diagnostic UI, not final art/UI.
using System.Collections.Generic;
using UnityEngine;
using Oiyo.Neon;

public sealed class SlicePlayer : MonoBehaviour
{
    Run run = new Run(20261113);
    readonly List<Transform> enemies = new List<Transform>();
    readonly List<Transform> gems = new List<Transform>();
    Transform ship;
    Sprite sprite;
    Camera view;
    float accumulator;
    bool dashQueued;
    int pointer = -1;
    Vector2 origin, stick;
    GUIStyle label, button;

    void Awake()
    {
        Application.targetFrameRate = 60;
        Application.runInBackground = false;
        var cameraObject = new GameObject("Slice Camera");
        view = cameraObject.AddComponent<Camera>();
        view.orthographic = true; view.transform.position = new Vector3(0, 0, -10);
        view.backgroundColor = new Color(0.025f, 0.04f, 0.08f);
        view.clearFlags = CameraClearFlags.SolidColor;
        var texture = new Texture2D(1, 1); texture.SetPixel(0, 0, Color.white); texture.Apply();
        sprite = Sprite.Create(texture, new Rect(0, 0, 1, 1), new Vector2(.5f, .5f), 1);
        ship = Make("Player", new Color(0.2f, 0.9f, 1), .65f);
    }
    Transform Make(string title, Color color, float size)
    {
        var obj = new GameObject(title); obj.transform.SetParent(transform);
        var renderer = obj.AddComponent<SpriteRenderer>(); renderer.sprite = sprite; renderer.color = color;
        obj.transform.localScale = Vector3.one * size;
        return obj.transform;
    }
    void ClearInput() { pointer = -1; stick = Vector2.zero; dashQueued = false; accumulator = 0; }
    void OnApplicationFocus(bool focused) { if (!focused) { run.Pause(); ClearInput(); } }
    void OnApplicationPause(bool paused) { if (paused) { run.Pause(); ClearInput(); } }
    void Update()
    {
        var safe = Screen.safeArea;
        view.rect = new Rect(safe.x / Screen.width, safe.y / Screen.height, safe.width / Screen.width, safe.height / Screen.height);
        view.orthographicSize = Mathf.Max(22, 17 / Mathf.Max(.1f, safe.width / safe.height));
        if (Input.GetKeyDown(KeyCode.Escape)) { run.Pause(); ClearInput(); }
        if (run.Phase != Phase.Playing) { ClearInput(); Sync(); return; }
        for (int i = 0; i < Input.touchCount; i++)
        {
            var touch = Input.GetTouch(i);
            if (touch.phase == TouchPhase.Began && pointer < 0 && touch.position.x < Screen.width * .55f)
            { pointer = touch.fingerId; origin = touch.position; }
            if (touch.fingerId != pointer) continue;
            if (touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled) { pointer = -1; stick = Vector2.zero; }
            else { var delta = (touch.position - origin) / 80; stick = delta.magnitude <= .12f ? Vector2.zero : Vector2.ClampMagnitude(delta, 1); }
        }
        if (Input.touchCount == 0) { pointer = -1; stick = Vector2.zero; }
        var keyboard = new Vector2((Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) ? 1 : 0) - (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) ? 1 : 0),
            (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow) ? 1 : 0) - (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow) ? 1 : 0));
        Vector2 move = pointer >= 0 ? stick : Vector2.ClampMagnitude(keyboard, 1);
        dashQueued |= Input.GetKeyDown(KeyCode.Space);
        // WHY: cap catch-up after interruptions; never simulate seconds of missed input.
        accumulator = Mathf.Min(accumulator + Time.unscaledDeltaTime, Run.StepSeconds * 5);
        while (accumulator >= Run.StepSeconds && run.Phase == Phase.Playing)
        { run.Step(new Vec(move.x, move.y), dashQueued); dashQueued = false; accumulator -= Run.StepSeconds; }
        Sync();
    }
    void Sync()
    {
        ship.position = new Vector3(run.Position.X, run.Position.Y, 0);
        ship.rotation = Quaternion.Euler(0, 0, Mathf.Atan2(run.Facing.Y, run.Facing.X) * Mathf.Rad2Deg);
        ship.localScale = Vector3.one * (run.DashTime > 0 ? .85f : .65f);
        for (int i = 0; i < run.Enemies.Count; i++)
        {
            if (i == enemies.Count) enemies.Add(Make("Enemy", Color.red, 1));
            var enemy = run.Enemies[i]; var obj = enemies[i]; obj.gameObject.SetActive(true);
            obj.position = new Vector3(enemy.Position.X, enemy.Position.Y, 0);
            obj.localScale = Vector3.one * enemy.Radius * 2;
            obj.GetComponent<SpriteRenderer>().color = enemy.Telegraph > 0 ? Color.yellow : new Color(1, .25f, .4f);
        }
        for (int i = run.Enemies.Count; i < enemies.Count; i++) enemies[i].gameObject.SetActive(false);
        for (int i = 0; i < run.Gems.Count; i++)
        {
            if (i == gems.Count) gems.Add(Make("XP", new Color(.3f, 1, .6f), .22f));
            gems[i].gameObject.SetActive(true); gems[i].position = new Vector3(run.Gems[i].X, run.Gems[i].Y, 0);
        }
        for (int i = run.Gems.Count; i < gems.Count; i++) gems[i].gameObject.SetActive(false);
    }
    void OnGUI()
    {
        if (label == null) { label = new GUIStyle(GUI.skin.label) { fontSize = 18 }; button = new GUIStyle(GUI.skin.button) { fontSize = 18 }; }
        Rect safe = Screen.safeArea;
        var area = new Rect(safe.x + 12, Screen.height - safe.yMax + 12, safe.width - 24, safe.height - 24);
        GUILayout.BeginArea(area);
        GUILayout.Label("NEON / UNITY EXPERIMENT — placeholder art", label);
        GUILayout.Label($"{run.Time:0}s / 180  |  HP {run.Hp:0}/{run.MaxHp:0}  |  Lv {run.Level}  |  Kills {run.Kills}", label);
        if (run.Phase == Phase.Briefing)
        {
            GUILayout.Label("Survive 3 minutes. Move: WASD/arrows or drag left half. Auto-fire. Dash: Space/right button.", label);
            if (GUILayout.Button("Start seed 20261113", button, GUILayout.Height(52))) { ClearInput(); run.Start(); }
        }
        else if (run.Phase == Phase.Paused)
        { if (GUILayout.Button("Resume", button, GUILayout.Height(52))) { ClearInput(); run.Resume(); } }
        else if (run.Phase == Phase.Upgrade)
        {
            GUILayout.Label("Choose your build", label);
            if (GUILayout.Button("Power +8 damage", button, GUILayout.Height(52))) run.Choose(Upgrade.Power);
            if (GUILayout.Button("Cadence +15% fire rate", button, GUILayout.Height(52))) run.Choose(Upgrade.Cadence);
            if (GUILayout.Button("Hull +20 max HP / repair 35", button, GUILayout.Height(52))) run.Choose(Upgrade.Hull);
        }
        else if (run.Phase == Phase.Won || run.Phase == Phase.Lost)
        {
            GUILayout.Label(run.Phase == Phase.Won ? "Extraction complete" : "Hull destroyed", label);
            if (GUILayout.Button("Retry same seed", button, GUILayout.Height(52))) { ClearInput(); run = new Run(20261113); run.Start(); }
        }
        else if (GUILayout.Button("Pause", button, GUILayout.Width(100), GUILayout.Height(48))) { run.Pause(); ClearInput(); }
        GUILayout.EndArea();
        if (run.Phase == Phase.Playing)
        {
            GUI.enabled = run.DashCooldown <= 0;
            if (GUI.Button(new Rect(safe.xMax - 124, Screen.height - safe.yMin - 76, 112, 64), run.DashCooldown > 0 ? $"{run.DashCooldown:0.0}s" : "DASH", button)) dashQueued = true;
            GUI.enabled = true;
        }
    }
}
