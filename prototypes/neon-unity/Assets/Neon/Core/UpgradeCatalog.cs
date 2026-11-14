using System.Collections.Generic;

namespace Oiyo.Neon
{
    public static class UpgradeCatalog
    {
        static readonly UpgradeSpec[] All =
        {
            new UpgradeSpec(Upgrade.Power, UpgradeTier.Silver, 3, .132f,
                new[] { "이온 렌즈", "ION LENS", "イオンレンズ", "离子透镜", "LENTILLE IONIQUE", "LENTE IÓNICA" },
                new[] { "사격 피해 +13%", "+13% shot damage", "射撃ダメージ +13%", "射击伤害 +13%", "Dégâts +13 %", "Daño +13 %" }),
            new UpgradeSpec(Upgrade.Cadence, UpgradeTier.Silver, 3, .102f,
                new[] { "고속 격자", "RAPID LATTICE", "高速ラティス", "高速晶格", "CADENCE RAPIDE", "RITMO RÁPIDO" },
                new[] { "사격 간격 -10%", "10% faster fire cycle", "射撃間隔 -10%", "射击间隔 -10%", "Tirs 10 % plus rapides", "Disparo 10 % más rápido" }),
            new UpgradeSpec(Upgrade.Magnet, UpgradeTier.Silver, 3, 2f,
                new[] { "루멘 수확기", "LUMEN HARVESTER", "ルーメン収集器", "流明收集器", "RÉCOLTEUR LUMEN", "COSECHADOR LUMEN" },
                new[] { "파편 흡인 +2, 연사·이동 소폭 상승", "+2 attraction, slight fire & move boost", "吸引範囲 +2、連射・移動微増", "吸引 +2，射速与移速微升", "Attraction +2, cadence et vitesse +", "Atracción +2, cadencia y velocidad +" }),
            new UpgradeSpec(Upgrade.VectorDrive, UpgradeTier.Silver, 3, .085f,
                new[] { "벡터 코일", "VECTOR COIL", "ベクターコイル", "矢量线圈", "BOBINE VECTORIELLE", "BOBINA VECTORIAL" },
                new[] { "이동 +8.5%, 대시 회복 +8%", "+8.5% move, 8% faster dash", "移動 +8.5%、ダッシュ回復 +8%", "移动 +8.5%，冲刺恢复 +8%", "Vitesse +8,5 %, dash +8 %", "Velocidad +8,5 %, dash +8 %" }),
            new UpgradeSpec(Upgrade.PhaseReturn, UpgradeTier.Gold, 2, 22f,
                new[] { "위상 귀환", "PHASE RETURN", "位相リターン", "相位回响", "RETOUR DE PHASE", "RETORNO DE FASE" },
                new[] { "대시가 주변 적을 강하게 밀쳐냅니다", "Dash releases a shockwave", "ダッシュで周囲を強く弾き飛ばす", "冲刺释放强力近身冲击波", "Le dash repousse les ennemis", "El dash repele a los enemigos" }),
            new UpgradeSpec(Upgrade.SplitCharge, UpgradeTier.Gold, 2, .60f,
                new[] { "분열 전하", "SPLIT CHARGE", "分裂チャージ", "分裂电荷", "CHARGE FRACTURÉE", "CARGA DIVIDIDA" },
                new[] { "네 번째 사격이 이웃에게 연쇄됩니다", "Every fourth shot chains nearby", "4発ごとに近くへ連鎖", "每四发连锁附近目标", "Chaque 4e tir ricoche", "Cada 4.º tiro se encadena" }),
            new UpgradeSpec(Upgrade.Hull, UpgradeTier.Gold, 2, 20f,
                new[] { "선체 직조", "HULL WEAVE", "船体織り", "装甲编织", "TISSAGE DE COQUE", "BLINDAJE TEJIDO" },
                new[] { "최대 선체 +20, 즉시 수리 +26", "+20 hull and repair 26", "船体 +20、修復 26", "装甲 +20，修复 26", "+20 coque, répare 26", "+20 blindaje, repara 26" }),
            new UpgradeSpec(Upgrade.EventHorizon, UpgradeTier.Prismatic, 1, .13f,
                new[] { "사건의 지평선", "EVENT HORIZON", "事象の地平線", "事件视界", "HORIZON DES ÉVÉNEMENTS", "HORIZONTE DE SUCESOS" },
                new[] { "피해·연사 상승, 이동·대시 둔화", "More damage & fire; slower move & dash", "火力・連射上昇、移動・ダッシュ鈍化", "伤害与射速提高，移动与冲刺减慢", "Plus de dégâts, mobilité réduite", "Más daño, menor movilidad" })
        };

        public static IReadOnlyList<UpgradeSpec> Entries => All;
        public static UpgradeSpec Get(Upgrade id)
        {
            for (int i = 0; i < All.Length; i++) if (All[i].Id == id) return All[i];
            return null;
        }
    }
}
