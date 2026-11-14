using System;

namespace Oiyo.Neon
{
    public sealed class ObservatoryCodex
    {
        public const int CurrentVersion = 1;
        public int Version { get; private set; } = CurrentVersion;
        public int TotalRuns { get; private set; }
        public int TotalExtractions { get; private set; }
        public int WardenDefeats { get; private set; }
        public int ArchitectDefeats { get; private set; }
        public int DailyExtractions { get; private set; }
        public int BestSurvivalSeconds { get; private set; }
        public int ChassisClearMask { get; private set; }
        public int AwakeningMask { get; private set; }

        public bool IsMilestoneUnlocked(int index)
        {
            switch (index)
            {
                case 0: return TotalExtractions > 0;
                case 1: return WardenDefeats > 0;
                case 2: return ArchitectDefeats > 0;
                case 3: return DailyExtractions > 0;
                case 4: return ChassisClearMask == 7;
                case 5: return AwakeningMask == 15;
                default: return false;
            }
        }

        public int UnlockedMilestones
        {
            get
            {
                int m = 0;
                for (int i = 0; i < 6; i++) if (IsMilestoneUnlocked(i)) m++;
                return m;
            }
        }

        public void RecordRun(Run run)
        {
            if (run == null || (run.Phase != Phase.Won && run.Phase != Phase.Lost)) return;
            TotalRuns++;
            int sec = (int)Math.Round(run.Time);
            if (sec > BestSurvivalSeconds) BestSurvivalSeconds = sec;
            if (run.AwakenedPhaseNova) AwakeningMask |= 1;
            if (run.AwakenedArcTempest) AwakeningMask |= 2;
            if (run.AwakenedSingularity) AwakeningMask |= 4;
            if (run.AwakenedThermalLance) AwakeningMask |= 8;
            if (run.WardenDefeated)
            {
                if (run.ActiveBossKind == EnemyKind.SolarArchitect) ArchitectDefeats++;
                else WardenDefeats++;
            }
            if (run.Phase == Phase.Won)
            {
                TotalExtractions++;
                ChassisClearMask |= 1 << (int)run.Chassis;
                if (run.IsDailyRun) DailyExtractions++;
            }
        }

        public string Serialize() =>
            $"v{Version}|{TotalRuns}|{TotalExtractions}|{WardenDefeats}|{ArchitectDefeats}|{DailyExtractions}|{BestSurvivalSeconds}|{ChassisClearMask}|{AwakeningMask}";

        public static ObservatoryCodex Deserialize(string raw)
        {
            var codex = new ObservatoryCodex();
            if (string.IsNullOrWhiteSpace(raw)) return codex;
            string[] parts = raw.Trim().Split('|');
            if (parts.Length < 9 || !parts[0].StartsWith("v")) return codex;
            if (!int.TryParse(parts[0].Substring(1), out int ver) || ver < 1) return codex;
            codex.Version = CurrentVersion;
            codex.TotalRuns = SafeNonNeg(parts[1]);
            codex.TotalExtractions = SafeNonNeg(parts[2]);
            codex.WardenDefeats = SafeNonNeg(parts[3]);
            codex.ArchitectDefeats = SafeNonNeg(parts[4]);
            codex.DailyExtractions = SafeNonNeg(parts[5]);
            codex.BestSurvivalSeconds = Math.Min(180, SafeNonNeg(parts[6]));
            codex.ChassisClearMask = SafeNonNeg(parts[7]) & 7;
            codex.AwakeningMask = SafeNonNeg(parts[8]) & 15;
            return codex;
        }

        static int SafeNonNeg(string s) => int.TryParse(s, out int v) && v > 0 ? v : 0;
    }
}
