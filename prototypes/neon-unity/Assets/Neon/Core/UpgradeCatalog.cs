using System.Collections.Generic;

namespace Oiyo.Neon
{
    public static class UpgradeCatalog
    {
        static readonly UpgradeSpec[] All =
        {
            new UpgradeSpec(Upgrade.Power, UpgradeTier.Silver, 3, .132f,
                new[] { "이온 렌즈", "ION LENS", "イオンレンズ", "离子透镜", "LENTILLE IONIQUE", "LENTE IÓNICA" },
                new[] { "사격 피해 +13% (장갑 파쇄와 조합 시 초열 랜스 각성)", "+13% shot damage (awakens Thermal Lance with Armor Breaker)", "射撃ダメージ +13%（装甲破砕と共鳴）", "射击伤害 +13%（与破甲核心共鸣）", "Dégâts +13 % (synergie Brise-armure)", "Daño +13 % (sinergia Rompeblindaje)" }),
            new UpgradeSpec(Upgrade.Cadence, UpgradeTier.Silver, 3, .102f,
                new[] { "고속 격자", "RAPID LATTICE", "高速ラティス", "高速晶格", "CADENCE RAPIDE", "RITMO RÁPIDO" },
                new[] { "사격 간격 -10% (분열 전하와 조합 시 아크 템페스트 각성)", "10% faster fire cycle (awakens Arc Tempest with Split Charge)", "射撃間隔 -10%（分裂チャージと共鳴）", "射击间隔 -10%（与分裂电荷共鸣）", "Tirs 10 % plus rapides", "Disparo 10 % más rápido" }),
            new UpgradeSpec(Upgrade.Magnet, UpgradeTier.Silver, 3, 2f,
                new[] { "루멘 수확기", "LUMEN HARVESTER", "ルーメン収集器", "流明收集器", "RÉCOLTEUR LUMEN", "COSECHADOR LUMEN" },
                new[] { "파편 흡인 +2, 연사·이동 상승 (중력 우물과 싱귤래리티 각성)", "+2 attraction, fire & move boost (awakens Singularity with Gravity Well)", "吸引範囲 +2、連射・移動微増（重力井戸と共鳴）", "吸引 +2，射速与移速微升（与引力井共鸣）", "Attraction +2, cadence et vitesse +", "Atracción +2, cadencia y velocidad +" }),
            new UpgradeSpec(Upgrade.VectorDrive, UpgradeTier.Silver, 3, .085f,
                new[] { "벡터 코일", "VECTOR COIL", "ベクターコイル", "矢量线圈", "BOBINE VECTORIELLE", "BOBINA VECTORIAL" },
                new[] { "이동 +8.5%, 대시 회복 +8% (위상 귀환과 페이즈 노바 각성)", "+8.5% move, 8% faster dash (awakens Phase Nova with Phase Return)", "移動 +8.5%、ダッシュ回復 +8%（位相リターンと共鳴）", "移动 +8.5%，冲刺恢复 +8%（与相位回响共鸣）", "Vitesse +8,5 %, dash +8 %", "Velocidad +8,5 %, dash +8 %" }),
            new UpgradeSpec(Upgrade.PhaseReturn, UpgradeTier.Gold, 2, 22f,
                new[] { "위상 귀환", "PHASE RETURN", "位相リターン", "相位回响", "RETOUR DE PHASE", "RETORNO DE FASE" },
                new[] { "대시가 주변 적을 강하게 밀쳐내고 피해를 줍니다", "Dash releases a kinetic shockwave", "ダッシュで周囲を強く弾き飛ばす", "冲刺释放强力近身冲击波", "Le dash repousse les ennemis", "El dash repele a los enemigos" }),
            new UpgradeSpec(Upgrade.SplitCharge, UpgradeTier.Gold, 2, .60f,
                new[] { "분열 전하", "SPLIT CHARGE", "分裂チャージ", "分裂电荷", "CHARGE FRACTURÉE", "CARGA DIVIDIDA" },
                new[] { "주기적 사격이 인접한 적들에게 연쇄 번개를 일으킵니다", "Periodic shots chain lightning to nearby hostiles", "一定間隔で近くの敵へ連鎖電撃", "周期射击向附近目标释放连锁闪电", "Les tirs ricochent en chaîne", "Los disparos se encadenan" }),
            new UpgradeSpec(Upgrade.Hull, UpgradeTier.Gold, 2, 20f,
                new[] { "선체 직조", "HULL WEAVE", "船体織り", "装甲编织", "TISSAGE DE COQUE", "BLINDAJE TEJIDO" },
                new[] { "최대 선체 +20, 즉시 수리 +26", "+20 hull and repair 26", "船体 +20、修復 26", "装甲 +20，修复 26", "+20 coque, répare 26", "+20 blindaje, repara 26" }),
            new UpgradeSpec(Upgrade.EventHorizon, UpgradeTier.Prismatic, 1, .13f,
                new[] { "사건의 지평선", "EVENT HORIZON", "事象の地平線", "事件视界", "HORIZON DES ÉVÉNEMENTS", "HORIZONTE DE SUCESOS" },
                new[] { "피해·연사 대폭 상승, 이동·대시 둔화", "Massive damage & fire boost; slower move & dash", "火力・連射上昇、移動・ダッシュ鈍化", "伤害与射速提高，移动与冲刺减慢", "Plus de dégâts, mobilité réduite", "Más daño, menor movilidad" }),
            new UpgradeSpec(Upgrade.OrbitalPrism, UpgradeTier.Gold, 2, 13f,
                new[] { "궤도 프리즘", "ORBITAL PRISM", "オービタル・プリズム", "轨道棱镜", "PRISME ORBITAL", "PRISMA ORBITAL" },
                new[] { "기체 주변을 회전하며 접촉한 적을 베는 위성 +1기", "Deploys an orbiting prism blade that slices nearby enemies", "機体周囲を回転し敵を切り裂くプリズム衛星 +1", "部署环绕机体旋转切割敌人的棱镜卫星 +1", "+1 prisme orbital tranchant", "+1 prisma orbital cortante" }),
            new UpgradeSpec(Upgrade.GravityWell, UpgradeTier.Gold, 2, .18f,
                new[] { "중력 우물", "GRAVITY WELL", "グラビティ・ウェル", "引力井", "PUITS DE GRAVITÉ", "POZO GRAVITATORIO" },
                new[] { "주변 적의 이동 속도를 18% 늦추는 중력 역장 전개", "Generates a field that slows nearby hostiles by 18%", "周囲の敵の移動速度を18%低下させる重力場", "展开使周围敌人减速18%的引力场", "Ralentit les ennemis proches de 18 %", "Ralentiza enemigos cercanos un 18 %" }),
            new UpgradeSpec(Upgrade.ArmorBreaker, UpgradeTier.Silver, 3, .22f,
                new[] { "장갑 파쇄자", "ARMOR BREAKER", "アーマーブレイカー", "破甲核心", "BRISE-ARMURE", "ROMPEBLINDAJE" },
                new[] { "바스티온·파수자 대상 피해 +22% 및 관통 탄도 강화", "+22% damage vs Bastion & Warden; empowers piercing shots", "重装甲・守護者へのダメージ +22%", "对堡垒与守望者伤害 +22%", "+22 % dégâts contre blindés et Gardien", "+22 % daño contra blindados y Guardián" }),
            new UpgradeSpec(Upgrade.ChronoStep, UpgradeTier.Gold, 2, 16f,
                new[] { "크로노 잔상", "CHRONO STEP", "クロノ・ステップ", "时空残影", "PAS CHRONO", "PASO CRONO" },
                new[] { "대시 출발 지점에 시간 균열을 남겨 적을 타격합니다", "Dash leaves a temporal pulse at departure point", "ダッシュ開始地点に時間亀裂を残し周囲を攻撃", "冲刺在起点留下时空裂隙痛击敌人", "Le dash laisse une impulsion temporelle", "El impulso deja un pulso temporal" })
        };

        public static IReadOnlyList<UpgradeSpec> Entries => All;
        public static UpgradeSpec Get(Upgrade id)
        {
            for (int i = 0; i < All.Length; i++) if (All[i].Id == id) return All[i];
            return null;
        }
    }
}
