// PROTOTYPE ONLY — validates a three-minute loop; not a production port.
using System;
using System.Collections.Generic;

namespace Oiyo.Neon
{
    public enum Phase { Briefing, Playing, Paused, Upgrade, Won, Lost }
    public enum Upgrade { Power, Cadence, Hull }
    public struct Vec
    {
        public float X, Y;
        public Vec(float x, float y) { X = x; Y = y; }
        public float Length => (float)Math.Sqrt(X * X + Y * Y);
        public Vec Unit => Length > 0.0001f ? this * (1 / Length) : new Vec(1, 0);
        public static Vec operator +(Vec a, Vec b) => new Vec(a.X + b.X, a.Y + b.Y);
        public static Vec operator -(Vec a, Vec b) => new Vec(a.X - b.X, a.Y - b.Y);
        public static Vec operator *(Vec a, float b) => new Vec(a.X * b, a.Y * b);
    }
    public sealed class Enemy
    {
        public int Id;
        public Vec Position;
        public float Hp, Speed, Radius, Telegraph;
    }
    public sealed class Run
    {
        public const float StepSeconds = 1f / 60f;
        public const float Duration = 180;
        public const float HalfWidth = 15, HalfHeight = 20;
        public Phase Phase { get; private set; } = Phase.Briefing;
        public Vec Position { get; private set; }
        public Vec Facing { get; private set; } = new Vec(1, 0);
        public float Time { get; private set; }
        public float Hp { get; private set; } = 100;
        public float MaxHp { get; private set; } = 100;
        public float DashTime { get; private set; }
        public float DashCooldown { get; private set; }
        public int Kills { get; private set; }
        public int Level { get; private set; } = 1;
        public float Damage { get; private set; } = 18;
        public float FireInterval { get; private set; } = 0.45f;
        public int Shots { get; private set; }
        public Vec LastShotTarget { get; private set; }
        public readonly List<Enemy> Enemies = new List<Enemy>();
        public readonly List<Vec> Gems = new List<Vec>();
        uint random;
        int nextId, xp;
        float spawnClock, fireClock, hurtClock;
        public Run(uint seed) { random = seed == 0 ? 1u : seed; }
        public void Start() { if (Phase == Phase.Briefing) Phase = Phase.Playing; }
        public void Pause() { if (Phase == Phase.Playing) Phase = Phase.Paused; }
        public void Resume() { if (Phase == Phase.Paused) Phase = Phase.Playing; }
        public void Choose(Upgrade upgrade)
        {
            if (Phase != Phase.Upgrade || !Enum.IsDefined(typeof(Upgrade), upgrade)) return;
            if (upgrade == Upgrade.Power) Damage += 8;
            if (upgrade == Upgrade.Cadence) FireInterval = Math.Max(0.15f, FireInterval * 0.85f);
            if (upgrade == Upgrade.Hull) { MaxHp += 20; Hp = Math.Min(MaxHp, Hp + 35); }
            Phase = Phase.Playing;
        }
        float Random01()
        {
            // WHY (2026-11-13): Own the PRNG so engine/runtime changes cannot alter a replay.
            random ^= random << 13; random ^= random >> 17; random ^= random << 5;
            return (random >> 8) / 16777216f;
        }
        public void Step(Vec move, bool dash)
        {
            if (Phase != Phase.Playing) return;
            if (float.IsNaN(move.X) || float.IsInfinity(move.X) || float.IsNaN(move.Y) || float.IsInfinity(move.Y)) move = new Vec();
            const float dt = StepSeconds;
            var length = move.Length;
            if (length > 1) move = move.Unit;
            if (move.Length > 0.05f) Facing = move.Unit;
            if (dash && DashCooldown <= 0) { DashTime = 0.18f; DashCooldown = 2; }
            float burst = Math.Min(dt, DashTime);
            var direction = DashTime > 0 ? Facing : move;
            var position = Position + direction * (5 * (dt + burst * 1.6f));
            Position = new Vec(Math.Max(-HalfWidth, Math.Min(HalfWidth, position.X)), Math.Max(-HalfHeight, Math.Min(HalfHeight, position.Y)));
            bool invulnerable = DashTime > 0;
            DashTime = Math.Max(0, DashTime - dt);
            DashCooldown = Math.Max(0, DashCooldown - dt);
            hurtClock = Math.Max(0, hurtClock - dt);
            Time += dt;
            spawnClock -= dt;
            if (spawnClock <= 0 && Enemies.Count < 120)
            {
                float angle = Random01() * (float)Math.PI * 2;
                bool tank = Time > 60 && Random01() > 0.75f;
                Enemies.Add(new Enemy { Id = ++nextId,
                    Position = new Vec((float)Math.Cos(angle) * 18, (float)Math.Sin(angle) * 23),
                    Hp = tank ? 90 : 26, Speed = tank ? 1.4f : 2.2f,
                    Radius = tank ? 0.65f : 0.35f, Telegraph = 0.6f });
                spawnClock = Math.Max(0.22f, 1.1f - Time / 220);
            }
            Enemy nearest = null; float distance = 100000;
            foreach (var enemy in Enemies)
            {
                enemy.Telegraph = Math.Max(0, enemy.Telegraph - dt);
                var delta = Position - enemy.Position;
                if (enemy.Telegraph <= 0) enemy.Position += delta.Unit * (enemy.Speed * dt);
                float d = (Position - enemy.Position).Length;
                if (d < distance && enemy.Telegraph <= 0) { nearest = enemy; distance = d; }
                if (enemy.Telegraph <= 0 && d < enemy.Radius + 0.35f && hurtClock <= 0 && !invulnerable)
                { Hp = Math.Max(0, Hp - 12); hurtClock = 0.7f; }
            }
            fireClock = Math.Max(0, fireClock - dt);
            if (nearest != null && distance < 10 && fireClock <= 0)
            {
                nearest.Hp -= Damage; LastShotTarget = nearest.Position; Shots++;
                fireClock = FireInterval;
            }
            for (int i = Enemies.Count - 1; i >= 0; i--)
                if (Enemies[i].Hp <= 0) { Gems.Add(Enemies[i].Position); Enemies.RemoveAt(i); Kills++; }
            for (int i = Gems.Count - 1; i >= 0; i--)
            {
                var delta = Position - Gems[i];
                if (delta.Length < 0.6f) { xp++; Gems.RemoveAt(i); }
                else if (delta.Length < 3) Gems[i] += delta.Unit * (8 * dt);
            }
            // WHY: death/win owns the terminal frame; an upgrade must not hide the result.
            if (Hp <= 0) Phase = Phase.Lost;
            else if (Time >= Duration) Phase = Phase.Won;
            else if (xp >= Level * 3) { xp -= Level * 3; Level++; Phase = Phase.Upgrade; }
        }
    }
}
