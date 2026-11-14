namespace Oiyo.Neon
{
    public static class WaveDirector
    {
        public static float SpawnInterval(float time)
        {
            if (time < 20) return 1.4f;
            if (time < 50) return 1.05f;
            if (time < 80) return .78f;
            if (time < 110) return .62f;
            if (time < BalanceConfig.WardenSpawnAt) return 1.05f;
            if (time < BalanceConfig.ExtractionStart) return .78f;
            return .48f;
        }

        public static EnemyKind Choose(float time, float roll)
        {
            if (time < 50) return EnemyKind.Drone;
            if (time < 80) return roll < .28f ? EnemyKind.Skitter : roll < .40f ? EnemyKind.NullLeech : EnemyKind.Drone;
            if (time < 110) return roll < .26f ? EnemyKind.Bastion : roll < .46f ? EnemyKind.Skitter : roll < .60f ? EnemyKind.TetherWeaver : roll < .72f ? EnemyKind.NullLeech : EnemyKind.Drone;
            if (time < BalanceConfig.WardenSpawnAt) return roll < .16f ? EnemyKind.Bastion : roll < .28f ? EnemyKind.TetherWeaver : EnemyKind.Drone;
            return roll < .16f ? EnemyKind.Bastion : roll < .36f ? EnemyKind.Skitter : roll < .48f ? EnemyKind.TetherWeaver : roll < .58f ? EnemyKind.NullLeech : EnemyKind.Drone;
        }

        public static int ActiveCap(float time) =>
            time < 50 ? BalanceConfig.EarlyWaveCap : time < 110 ? BalanceConfig.MidWaveCap :
            time < BalanceConfig.WardenSpawnAt ? BalanceConfig.PreBossWaveCap :
            time < BalanceConfig.ExtractionStart ? BalanceConfig.BossWaveCap : BalanceConfig.ExtractionWaveCap;
    }
}
