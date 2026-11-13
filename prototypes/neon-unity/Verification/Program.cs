using System;
using Oiyo.Neon;
static class Checks
{
    static int count;
    static void Check(bool value, string title) { if (!value) throw new Exception(title); count++; Console.WriteLine("PASS " + title); }
    static Run Started(uint seed = 123) { var run = new Run(seed); run.Start(); return run; }
    static void Main()
    {
        var run = Started(); run.Step(new Vec(1, 0), true);
        Check(run.Position.X > .2f && run.DashCooldown > 1.9f, "dash bursts and starts cooldown");
        var time = run.Time; var cooldown = run.DashCooldown; var position = run.Position;
        run.Pause(); for (int i = 0; i < 600; i++) run.Step(new Vec(1, 0), true);
        Check(run.Time == time && run.DashCooldown == cooldown && run.Position.X == position.X, "pause freezes time, recharge and input");
        run.Resume(); run.Step(new Vec(1, 0), true);
        Check(run.DashCooldown < cooldown, "dash spam cannot refresh cooldown");
        var a = Started(); var b = Started();
        for (int i = 0; i < 3000; i++)
        {
            var move = new Vec((float)Math.Cos(i * .01), (float)Math.Sin(i * .01));
            if (a.Phase == Phase.Upgrade) { a.Choose(Upgrade.Cadence); b.Choose(Upgrade.Cadence); }
            a.Step(move, i % 150 == 0); b.Step(move, i % 150 == 0);
        }
        Check(a.Position.X == b.Position.X && a.Position.Y == b.Position.Y && a.Kills == b.Kills && a.Hp == b.Hp && a.Enemies.Count == b.Enemies.Count, "same seed and inputs reproduce run");
        for (int i = 0; i < a.Enemies.Count; i++) Check(a.Enemies[i].Position.X == b.Enemies[i].Position.X, "enemy replay " + i);
        var upgrade = Started(); upgrade.Gems.Add(new Vec()); upgrade.Gems.Add(new Vec()); upgrade.Gems.Add(new Vec());
        upgrade.Step(new Vec(), false); Check(upgrade.Phase == Phase.Upgrade && upgrade.Level == 2, "earned XP opens choice");
        time = upgrade.Time; upgrade.Step(new Vec(), false); Check(upgrade.Time == time, "choice freezes combat");
        upgrade.Choose((Upgrade)99); Check(upgrade.Phase == Phase.Upgrade, "invalid choice cannot resume");
        upgrade.Choose(Upgrade.Power); Check(upgrade.Damage == 26 && upgrade.Phase == Phase.Playing, "power choice changes build");
        var lost = Started();
        for (int i = 0; i < 1000 && lost.Phase == Phase.Playing; i++)
        { lost.Enemies.Add(new Enemy { Position = lost.Position, Hp = 100000, Radius = 1 }); lost.Step(new Vec(), false); }
        Check(lost.Phase == Phase.Lost && lost.Hp == 0, "lethal contact ends run");
        var retry = Started(); Check(retry.Hp == 100 && retry.Kills == 0 && retry.Time == 0 && retry.DashCooldown == 0, "retry starts a clean run");
        var terminal = Started();
        // A controlled terminal-transition fixture, not a balance/playability bot.
        for (int i = 0; i < 10810 && terminal.Phase == Phase.Playing; i++) { terminal.Enemies.Clear(); terminal.Step(new Vec(), false); }
        Check(terminal.Phase == Phase.Won, "three-minute terminal transition");
        time = terminal.Time; terminal.Step(new Vec(1, 0), true); Check(terminal.Time == time, "finished run is immutable to input");
        var invalid = Started(); invalid.Step(new Vec(float.NaN, float.PositiveInfinity), false);
        Check(!float.IsNaN(invalid.Position.X), "invalid input does not poison world");
        Console.WriteLine("CORE CHECKS: " + count + " passed. Unity rendering/device certification NOT assessed.");
    }
}
