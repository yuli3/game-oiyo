namespace Oiyo.Neon
{
    public static class BalanceConfig
    {
        public const float StepSeconds = 1f / 60f;
        public const float RunDuration = 180f;
        public const float ExtractionStart = 170f;
        public const float ExtractionRadius = 4f;
        public const float PlayerMaxHp = 100f;
        public const float ContactDamage = 12f;
        public const float ContactInvulnerability = .7f;
        public const float DashDuration = .18f;
        public const float DashCooldown = 2f;
        public const float PlayerSpeed = 5f;
        public const float HalfWidth = 11.25f;
        public const float HalfHeight = 20f;
        public const float PlayerDamage = 18f;
        public const float FireInterval = .45f;
        public const float PickupMagnetRange = 3f;
        public const float PickupCollectRange = .6f;
        public const float PickupSpeed = 8f;
        public const int UpgradeChoices = 3;
        public const int BaseXpToLevel = 3;
        public const float WardenWarningAt = 120f;
        public const float WardenSpawnAt = 126f;
        public const float WardenHealth = 620f;
        public const float WardenAttackInterval = 3f;
        public const float WardenAttackTell = .85f;
        public const int WardenVolleyCount = 8;
        public const float WardenProjectileSpeed = 4.1f;
        public const float WardenProjectileDamage = 14f;
        public const float WardenProjectileRadius = .28f;
        public const float WardenProjectileLifetime = 7f;
        public const float WardenContactDamage = 18f;
        public const float WardenContactCooldown = .85f;
        public const float CoreBonusHeal = 15f;
        public const float CoreBonusMaxHp = 10f;
        public const float HitProjectileSpeed = 13f;

        public const float DroneHp = 32f;
        public const float DroneSpeed = 2.2f;
        public const float DroneRadius = .38f;
        public const float SkitterHp = 26f;
        public const float SkitterSpeed = 3.65f;
        public const float SkitterRadius = .27f;
        public const float BastionHp = 94f;
        public const float BastionSpeed = 1.25f;
        public const float BastionRadius = .72f;
        public const float WardenSpeed = 1.05f;
        public const float WardenRadius = 1.15f;
        public const int EarlyWaveCap = 18;
        public const int MidWaveCap = 36;
        public const int PreBossWaveCap = 26;
        public const int BossWaveCap = 28;
        public const int ExtractionWaveCap = 20;

        public static int XpForNextLevel(int level) => BaseXpToLevel * level;
    }

    public enum UpgradeTier { Silver, Gold, Prismatic }

    public sealed class UpgradeSpec
    {
        public Upgrade Id { get; }
        public UpgradeTier Tier { get; }
        public int MaxStacks { get; }
        public float Magnitude { get; }
        public string[] Names { get; }
        public string[] Descriptions { get; }

        public UpgradeSpec(Upgrade id, UpgradeTier tier, int maxStacks, float magnitude,
            string[] names, string[] descriptions)
        {
            Id = id; Tier = tier; MaxStacks = maxStacks; Magnitude = magnitude;
            Names = names; Descriptions = descriptions;
        }
    }
}
