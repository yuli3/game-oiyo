using System;
using System.Collections.Generic;
using Oiyo.Neon;
static class SimulationAudit
{
    const int Samples=1000;
    enum Strategy { FirstOffered, GreedySalvage, BossHunter, MobilityShield }
    static void Main()
    {
        Audit("hold",false,Strategy.FirstOffered);
        Audit("evade-and-extract",true,Strategy.FirstOffered);
        Audit("greedy-salvage",true,Strategy.GreedySalvage);
        Audit("boss-hunter",true,Strategy.BossHunter);
        Audit("mobility-shield",true,Strategy.MobilityShield);
    }
    static void Audit(string label,bool active,Strategy strategy)
    {
        var survival=new List<float>(Samples);int extracted=0,bosses=0,totalKills=0;
        for(uint seed=1;seed<=Samples;seed++)
        {
            var r=new Run(seed);r.Start();int index=0;
            while(r.Phase==Phase.Playing&&index<10850)
            {
                Vec move=new Vec();bool dash=false;
                if(active)
                {
                    if(r.Time>=BalanceConfig.ExtractionStart)move=(r.ExtractionPosition-r.Position).Unit;
                    else
                    {
                        Enemy nearest=null;float distance=5f;foreach(var e in r.Enemies){float d=(e.Position-r.Position).Length;if(d<distance){distance=d;nearest=e;}}
                        if(nearest!=null&&distance<3.8f){Vec away=(r.Position-nearest.Position).Unit;Vec tangent=new Vec(-away.Y,away.X);move=(away*.84f+tangent*.34f).Unit;dash=distance<1.6f&&r.DashCooldown<=0;}
                        else if(r.Gems.Count>0){Vec to=r.Gems[0]-r.Position;if(to.Length<6f)move=to.Unit;else move=Orbit(r.Time,seed);}
                        else move=Orbit(r.Time,seed);
                        foreach(var shot in r.HostileShots)if((shot.Position-r.Position).Length<1.2f&&r.DashCooldown<=0){dash=true;break;}
                    }
                }
                r.Step(move,dash);
                if(r.Phase==Phase.Upgrade)r.Choose(PickUpgrade(r,strategy));
                index++;
            }
            survival.Add(r.Time);if(r.Phase==Phase.Won)extracted++;if(r.WardenDefeated)bosses++;totalKills+=r.Kills;
        }
        survival.Sort();Console.WriteLine(label+" seeds="+Samples+" extracted="+extracted+" bossDefeated="+bosses+" medianSeconds="+survival[Samples/2].ToString("0.0")+" p10="+survival[Samples/10].ToString("0.0")+" p90="+survival[Samples*9/10].ToString("0.0")+" meanKills="+(totalKills/(float)Samples).ToString("0.0"));
    }
    static Upgrade PickUpgrade(Run r,Strategy strategy)
    {
        Upgrade[] pref=strategy==Strategy.GreedySalvage?new[]{Upgrade.Magnet,Upgrade.Cadence,Upgrade.SplitCharge,Upgrade.VectorDrive}:
            strategy==Strategy.BossHunter?new[]{Upgrade.EventHorizon,Upgrade.Power,Upgrade.Cadence,Upgrade.SplitCharge}:
            strategy==Strategy.MobilityShield?new[]{Upgrade.VectorDrive,Upgrade.PhaseReturn,Upgrade.Hull,Upgrade.Cadence}:Array.Empty<Upgrade>();
        foreach(var p in pref)for(int i=0;i<r.Choices.Count;i++)if(r.Choices[i]==p)return p;
        return r.Choices[0];
    }
    static Vec Orbit(float time,uint seed){float a=time*.73f+(seed%997)*.013f;return new Vec((float)Math.Cos(a),(float)Math.Sin(a));}
}
