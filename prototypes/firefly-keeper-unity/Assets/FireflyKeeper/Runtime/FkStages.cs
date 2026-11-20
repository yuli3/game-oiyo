using System.Collections.Generic;
using UnityEngine;

namespace FireflyKeeper
{
    public enum EnemyKind { Patrol, Chaser }

    public class EnemyDef
    {
        public EnemyKind kind;
        public Vector2[] path;
        public float speed;
        public float chaseRange;
        public float fear; // chaser flees when player light radius >= fear
    }

    public class GateDef
    {
        public Rect rect;
        public int switchIndex;
    }

    public class SwitchDef
    {
        public Vector2 pos;
        public int need;
    }

    public class WindDef
    {
        public Rect rect;
        public Vector2 force;
    }

    public class StageDef
    {
        public int quota;
        public float oilDrain = 0.6f;
        public float par = 60f;
        public float darkness;
        public bool boss;
        public bool allSkittish;
        public Vector2 start = new Vector2(0f, -6.4f);
        public Vector2 goal = new Vector2(0f, 6.3f);
        public readonly List<Vector2> flies = new List<Vector2>();
        public readonly List<int> skittish = new List<int>();
        public readonly List<Rect> walls = new List<Rect>();
        public readonly List<GateDef> gates = new List<GateDef>();
        public readonly List<SwitchDef> switches = new List<SwitchDef>();
        public readonly List<EnemyDef> enemies = new List<EnemyDef>();
        public readonly List<WindDef> winds = new List<WindDef>();
        public readonly List<Vector2> dews = new List<Vector2>();

        public StageDef Flies(params float[] xy)
        {
            for (int i = 0; i + 1 < xy.Length; i += 2) flies.Add(new Vector2(xy[i], xy[i + 1]));
            return this;
        }

        public StageDef Wall(float x, float y, float w, float h)
        {
            walls.Add(new Rect(x, y, w, h));
            return this;
        }

        public StageDef Gate(float x, float y, float w, float h, int sw)
        {
            gates.Add(new GateDef { rect = new Rect(x, y, w, h), switchIndex = sw });
            return this;
        }

        public StageDef Switch(float x, float y, int need)
        {
            switches.Add(new SwitchDef { pos = new Vector2(x, y), need = need });
            return this;
        }

        public StageDef Patrol(float speed, params float[] xy)
        {
            var pts = new Vector2[xy.Length / 2];
            for (int i = 0; i < pts.Length; i++) pts[i] = new Vector2(xy[i * 2], xy[i * 2 + 1]);
            enemies.Add(new EnemyDef { kind = EnemyKind.Patrol, path = pts, speed = speed });
            return this;
        }

        public StageDef Chaser(float x, float y, float speed, float range, float fear)
        {
            enemies.Add(new EnemyDef { kind = EnemyKind.Chaser, path = new[] { new Vector2(x, y) }, speed = speed, chaseRange = range, fear = fear });
            return this;
        }

        public StageDef Wind(float x, float y, float w, float h, float fx, float fy)
        {
            winds.Add(new WindDef { rect = new Rect(x, y, w, h), force = new Vector2(fx, fy) });
            return this;
        }

        public StageDef Dews(params float[] xy)
        {
            for (int i = 0; i + 1 < xy.Length; i += 2) dews.Add(new Vector2(xy[i], xy[i + 1]));
            return this;
        }

        public StageDef Skittish(params int[] idx)
        {
            skittish.AddRange(idx);
            return this;
        }
    }

    /// <summary>Board is x -4.5..4.5, y -7.5..7.5. Rect(x, y, w, h) uses the min corner.</summary>
    public static class FkStages
    {
        public const float HalfW = 4.5f;
        public const float HalfH = 7.5f;
        public const int Count = 12;

        public static StageDef Build(int i)
        {
            switch (i)
            {
                case 0: // 첫 불빛 — 이동과 배달만
                    return new StageDef { quota = 5, oilDrain = 0.45f, par = 40f }
                        .Flies(-2.5f, -3.2f, 2.6f, -2f, -1.6f, 0.8f, 2.2f, 3f, 0f, -0.6f);
                case 1: // 연못가 — 벽을 돌아서
                    return new StageDef { quota = 7, oilDrain = 0.5f, par = 55f }
                        .Wall(-2.2f, -1.6f, 4.4f, 3.2f)
                        .Flies(-3.6f, -4f, 3.6f, -4f, -3.6f, 0f, 3.6f, 0f, -3.6f, 4f, 3.6f, 4f, 0f, -4.6f, 0f, 3.6f);
                case 2: // 그림자 첫 만남
                    return new StageDef { quota = 7, oilDrain = 0.55f, par = 65f }
                        .Patrol(1.5f, -3.8f, -1f, 3.8f, -1f)
                        .Patrol(1.8f, 3.8f, 3f, -3.8f, 3f)
                        .Flies(-3f, -4f, 3f, -4.5f, 0f, -2.6f, -3.5f, 1f, 3.5f, 1f, 0f, 1.1f, -2f, 4.6f, 2.5f, 4.8f);
                case 3: // 부적 문
                    return new StageDef { quota = 6, oilDrain = 0.55f, par = 80f }
                        .Wall(-4.5f, 2.3f, 3.3f, 0.5f).Wall(1.2f, 2.3f, 3.3f, 0.5f)
                        .Gate(-1.2f, 2.3f, 2.4f, 0.5f, 0)
                        .Switch(-3.1f, -2.4f, 3)
                        .Patrol(1.6f, -3.8f, 0.9f, 3.8f, 0.9f)
                        .Flies(-3.5f, -5f, 3.5f, -5f, -1f, -4f, 1.6f, -3f, 3.6f, -1f, -3.6f, 0.2f, 0.2f, -0.6f, 2.2f, -1.8f, -3f, 5f, 3f, 5f);
                case 4: // 바람 골짜기
                    return new StageDef { quota = 8, oilDrain = 0.6f, par = 80f }
                        .Wind(-4.5f, -3.4f, 9f, 1.6f, 2.4f, 0f)
                        .Wind(-4.5f, 1.4f, 9f, 1.6f, -2.4f, 0f)
                        .Patrol(1.4f, -3.2f, -5.8f, -3.2f, 5.8f)
                        .Patrol(1.4f, 3.2f, 5.8f, 3.2f, -5.8f)
                        .Flies(-1.5f, -5.2f, 1.5f, -5f, -3.9f, -2.6f, 3.9f, -2.6f, 0f, -0.6f, -2.2f, 0.2f, 2.2f, 0.4f, -3.9f, 2.2f, 3.9f, 2.4f, 0f, 4.4f);
                case 5: // 겁 많은 반딧불
                    return new StageDef { quota = 7, oilDrain = 0.6f, par = 90f, allSkittish = true }
                        .Chaser(0f, 3.6f, 1.6f, 3.4f, 99f)
                        .Flies(-3.4f, -4.6f, 3.4f, -4.4f, 0f, -3f, -3.6f, -1f, 3.6f, -0.8f, -1.4f, 1.6f, 1.6f, 1.8f, -3.2f, 4.6f, 3.2f, 4.8f);
                case 6: // 이슬 길
                    return new StageDef { quota = 8, oilDrain = 1.5f, par = 90f }
                        .Wall(-4.5f, -3.75f, 6.2f, 0.5f).Wall(-1.7f, -0.25f, 6.2f, 0.5f).Wall(-4.5f, 3.25f, 6.2f, 0.5f)
                        .Chaser(-3f, 1.6f, 1.7f, 3.2f, 99f)
                        .Chaser(3f, 5.2f, 1.7f, 3.2f, 99f)
                        .Dews(3.6f, -5.6f, -3.6f, -1.8f, 3.6f, 1.6f, -3.6f, 5f, 0f, -2f)
                        .Flies(-3.4f, -6f, 2.4f, -5f, -2.6f, -2.4f, 1.4f, -1.4f, 3.8f, -2.6f, -3.8f, 1f, 0.6f, 1.8f, 3.6f, 2.8f, -2f, 5.4f, 1.8f, 5.6f);
                case 7: // 두 개의 부적
                    return new StageDef { quota = 5, oilDrain = 0.65f, par = 110f, start = new Vector2(-2.6f, -6.4f) }
                        .Wall(-0.25f, -7.5f, 0.5f, 5.5f).Gate(-0.25f, -2f, 0.5f, 2f, 0).Wall(-0.25f, 0f, 0.5f, 3f)
                        .Wall(-4.5f, 3f, 3.3f, 0.5f).Gate(-1.2f, 3f, 2.4f, 0.5f, 1).Wall(1.2f, 3f, 3.3f, 0.5f)
                        .Switch(-2.4f, 1.6f, 3)
                        .Switch(2.4f, 1.6f, 3)
                        .Patrol(1.6f, 1.2f, -5.6f, 3.9f, -5.6f, 3.9f, -0.8f, 1.2f, -0.8f)
                        .Patrol(1.8f, -3.9f, 5.2f, 3.9f, 5.2f)
                        .Flies(-3.8f, -5f, -1.2f, -4.4f, -3.6f, -2.2f, -1.4f, -0.6f, -3.8f, 0.8f, 1.4f, -6.4f, 3.6f, -4.2f, 2.2f, -2.6f, 3.8f, -0.4f, 1.2f, 0.6f, -3.6f, 6.4f, 3.6f, 6.4f);
                case 8: // 큰 불빛만이
                    return new StageDef { quota = 10, oilDrain = 0.7f, par = 100f }
                        .Chaser(-3f, 2f, 2f, 3.6f, 2.3f)
                        .Chaser(3f, 2f, 2f, 3.6f, 2.3f)
                        .Chaser(0f, 4.6f, 2.1f, 3.8f, 2.3f)
                        .Flies(-3.8f, -6f, -1.4f, -5.4f, 1.4f, -5.6f, 3.8f, -6f, -2.6f, -3.4f, 0f, -3.8f, 2.6f, -3.4f, -3.8f, -1.2f, 3.8f, -1.2f, -1.4f, 0.4f, 1.4f, 0.4f, 0f, 2.2f);
                case 9: // 미로 숲
                    return new StageDef { quota = 10, oilDrain = 0.75f, par = 120f, start = new Vector2(-3.2f, -6.5f), goal = new Vector2(3.2f, 6.4f) }
                        .Wall(-4.5f, -4.75f, 7.2f, 0.5f).Wall(-2.7f, -1.75f, 7.2f, 0.5f).Wall(-4.5f, 1.25f, 7.2f, 0.5f).Wall(-2.7f, 4.25f, 7.2f, 0.5f)
                        .Wind(2.9f, -4.6f, 1.6f, 2.8f, 0f, -1.6f)
                        .Wind(-4.5f, 1.8f, 1.6f, 2.4f, 0f, -1.6f)
                        .Patrol(1.7f, -3.8f, -3.2f, 3.8f, -3.2f)
                        .Patrol(1.9f, 3.8f, 2.8f, -3.8f, 2.8f)
                        .Chaser(0f, -0.2f, 1.8f, 3f, 2.5f)
                        .Flies(0f, -6.2f, 3.8f, -6.4f, -3.8f, -3.6f, 0f, -2.6f, 3.8f, -3.6f, -3.8f, -0.6f, 3.8f, 0.4f, -1.6f, 0.4f, -3.8f, 2.6f, 1.6f, 3.4f, -3.8f, 5.6f, 0f, 6.4f);
                case 10: // 그믐 직전
                    return new StageDef { quota = 8, oilDrain = 1.2f, par = 130f, darkness = 0.7f }
                        .Wall(-4.5f, 0.75f, 3.3f, 0.5f).Wall(1.2f, 0.75f, 3.3f, 0.5f).Gate(-1.2f, 0.75f, 2.4f, 0.5f, 0)
                        .Switch(3.4f, -5.6f, 4)
                        .Wind(-4.5f, -3.6f, 4.2f, 2f, 0f, 1.8f)
                        .Wind(0.3f, 3.2f, 4.2f, 2f, -1.8f, 0f)
                        .Patrol(1.8f, -3.8f, -0.4f, 3.8f, -0.4f)
                        .Patrol(1.9f, 3.8f, 2.6f, -3.8f, 2.6f)
                        .Chaser(-3f, 5.2f, 1.9f, 3.4f, 2.4f)
                        .Chaser(3f, 5.2f, 1.9f, 3.4f, 2.4f)
                        .Dews(-3.6f, -6f, 3.6f, -2.4f, -3.6f, 4f, 3.6f, 6f)
                        .Skittish(1, 3, 5, 7, 9, 11)
                        .Flies(-3.6f, -4.6f, -1.2f, -6f, 1.2f, -4f, 3.8f, -3.8f, -2.4f, -1.4f, 1.6f, -1.2f, -3.6f, 2.4f, -1f, 3.4f, 1.4f, 2f, 3.8f, 1.8f, -2.4f, 6f, 2.2f, 6.2f, 0f, 4.8f);
                default: // 그믐 그림자 (boss)
                    return new StageDef { quota = 0, oilDrain = 0.55f, par = 150f, boss = true, darkness = 0.35f, start = new Vector2(0f, -6.2f) }
                        .Switch(-3.4f, -4.6f, 3)
                        .Switch(3.4f, -4.6f, 3)
                        .Switch(0f, 6f, 3)
                        .Dews(-3.8f, 1f, 3.8f, 1f, 0f, -6.8f)
                        .Flies(-3.6f, -6.4f, 3.6f, -6.4f, -2f, -2.4f, 2f, -2.4f, -3.8f, 3.6f, 3.8f, 3.6f, -1.6f, 6.6f, 1.6f, 6.6f);
            }
        }

        public static int Stars(bool cleared, bool noHit, float time, float par)
        {
            if (!cleared) return 0;
            return 1 + (noHit ? 1 : 0) + (time <= par ? 1 : 0);
        }
    }
}
