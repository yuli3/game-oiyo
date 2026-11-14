namespace Oiyo.Neon
{
    public enum ChassisId { AegisProbe, LancerDart, BastionCarrier }

    public sealed class ChassisSpec
    {
        public ChassisId Id { get; }
        public float MaxHp { get; }
        public float MoveSpeed { get; }
        public float DashCooldown { get; }
        public float Damage { get; }
        public float FireInterval { get; }
        public bool PiercingShots { get; }
        public int BaseOrbitals { get; }
        public string[] Names { get; }
        public string[] Subtitles { get; }

        public ChassisSpec(ChassisId id, float maxHp, float moveSpeed, float dashCooldown,
            float damage, float fireInterval, bool piercingShots, int baseOrbitals,
            string[] names, string[] subtitles)
        {
            Id = id; MaxHp = maxHp; MoveSpeed = moveSpeed; DashCooldown = dashCooldown;
            Damage = damage; FireInterval = fireInterval; PiercingShots = piercingShots; BaseOrbitals = baseOrbitals;
            Names = names; Subtitles = subtitles;
        }
    }

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

        public const float OrbitalRadius = 2.10f;
        public const float OrbitalAngularSpeed = 3.15f;
        public const float OrbitalTickInterval = .40f;
        public const float OrbitalBaseDamage = 10.0f;
        public const float GravityWellBaseRadius = 3.9f;
        public const float GravityWellSlowPerStack = .13f;

        public const float DroneHp = 32f;
        public const float DroneSpeed = 2.2f;
        public const float DroneRadius = .38f;
        public const float SkitterHp = 26f;
        public const float SkitterSpeed = 3.65f;
        public const float SkitterRadius = .27f;
        public const float BastionHp = 94f;
        public const float BastionSpeed = 1.25f;
        public const float BastionRadius = .72f;
        public const float WeaverHp = 38f;
        public const float WeaverSpeed = 2.05f;
        public const float WeaverRadius = .36f;
        public const float WeaverTetherRange = 5.4f;
        public const float WeaverTetherDamage = 10f;
        public const float LeechHp = 28f;
        public const float LeechSpeed = 3.15f;
        public const float LeechRadius = .32f;
        public const float WardenSpeed = 1.05f;
        public const float WardenRadius = 1.15f;
        public const float ArchitectHealth = 640f;
        public const float ArchitectSpeed = .98f;
        public const float ArchitectRadius = 1.18f;
        public const int EarlyWaveCap = 18;
        public const int MidWaveCap = 36;
        public const int PreBossWaveCap = 26;
        public const int BossWaveCap = 28;
        public const int ExtractionWaveCap = 20;

        static readonly ChassisSpec[] AllChassis =
        {
            new ChassisSpec(ChassisId.AegisProbe, 100f, 5.0f, 2.0f, 18f, .45f, false, 0,
                new[] { "이지스 프로브", "AEGIS PROBE", "イージス・プローブ", "神盾探针", "SONDE AEGIS", "SONDA AEGIS" },
                new[] { "균형 잡힌 표준 관측선 · 선체 100 · 표준 펄스 주포", "Balanced standard probe · 100 Hull · Standard pulse cannon", "標準観測機 · 装甲100 · 標準パルス砲", "均衡标准探针 · 装甲100 · 标准脉冲主炮", "Sonde équilibrée · Coque 100 · Canon standard", "Sonda equilibrada · Blindaje 100 · Cañón estándar" }),
            new ChassisSpec(ChassisId.LancerDart, 82f, 5.32f, 1.80f, 17.8f, .465f, true, 0,
                new[] { "랜서 다트", "LANCER DART", "ランサー・ダート", "枪骑飞镖", "DARD LANCIER", "DARDO LANCERO" },
                new[] { "고속 강습기 · 관통 사격 기본 장착 · 이동 +6% · 선체 82", "High-speed interceptor · Piercing shots · +6% Move · 82 Hull", "高速強襲機 · 貫通射撃 · 移動+6% · 装甲82", "高速突击机 · 穿透射击 · 移速+6% · 装甲82", "Intercepteur rapide · Tir perforant · Coque 82", "Interceptor veloz · Disparo perforante · Blindaje 82" }),
            new ChassisSpec(ChassisId.BastionCarrier, 122f, 4.62f, 2.18f, 16.5f, .475f, false, 1,
                new[] { "바스티온 캐리어", "BASTION CARRIER", "バスティオン・キャリア", "堡垒母舰", "PORTEUR BASTION", "PORTADOR BASTIÓN" },
                new[] { "중장갑 모함 · 기본 프리즘 위성 1기 동반 · 선체 122", "Heavy carrier · Starts with 1 Orbital Prism · 122 Hull", "重装甲母艦 · 初期プリズム衛星1基 · 装甲122", "重装母舰 · 初始自带1枚棱镜卫星 · 装甲122", "Porteur lourd · 1 Prisme orbital · Coque 122", "Portador pesado · 1 Prisma orbital · Blindaje 122" })
        };

        public static ChassisSpec GetChassis(ChassisId id)
        {
            for (int i = 0; i < AllChassis.Length; i++) if (AllChassis[i].Id == id) return AllChassis[i];
            return AllChassis[0];
        }

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
