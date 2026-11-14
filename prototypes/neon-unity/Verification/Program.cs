using System;
using System.Linq;
using Oiyo.Neon;
static class Checks
{
    static int count;
    static void Check(bool value,string title){if(!value)throw new Exception("FAIL "+title);count++;Console.WriteLine("PASS "+title);}
    static Run Started(uint seed=123, ChassisId chassis=ChassisId.AegisProbe, bool daily=false){var r=new Run(seed,chassis,daily);r.Start();return r;}
    static void TickTo(Run r,float time){while(r.Time<time&&r.Phase==Phase.Playing){for(int i=r.Enemies.Count-1;i>=0;i--)if(r.Enemies[i].Kind!=EnemyKind.Warden)r.Enemies.RemoveAt(i);r.Gems.Clear();r.Step(new Vec(),false);}}
    static void Main()
    {
        var a=Started();var b=Started();
        for(int i=0;i<3600;i++){var m=new Vec((float)Math.Cos(i*.01),(float)Math.Sin(i*.01));if(a.Phase==Phase.Upgrade)a.Choose(a.Choices[0]);if(b.Phase==Phase.Upgrade)b.Choose(b.Choices[0]);a.Step(m,i%150==0);b.Step(m,i%150==0);}
        Check(a.Time==b.Time&&a.Kills==b.Kills&&a.Hp==b.Hp&&a.Enemies.Count==b.Enemies.Count&&a.HostileShots.Count==b.HostileShots.Count,"same-seed inputs reproduce deterministic run");
        var dash=Started();dash.Step(new Vec(1,0),true);Check(dash.Position.X>.2f&&dash.DashCooldown>1.9f,"dash burst and cooldown");
        float t=dash.Time;var p=dash.Position;dash.Pause();for(int i=0;i<600;i++)dash.Step(new Vec(1,0),true);Check(dash.Time==t&&dash.Position.X==p.X,"pause freezes simulation and input");dash.Resume();
        var xp=Started();xp.Gems.Add(new Vec());xp.Gems.Add(new Vec());xp.Gems.Add(new Vec());xp.Step(new Vec(),false);Check(xp.Phase==Phase.Upgrade&&xp.Choices.Count==3&&xp.Choices.Distinct().Count()==3,"level grants three distinct choices");
        var offer=xp.Choices[0];Upgrade notOffered=Enum.GetValues(typeof(Upgrade)).Cast<Upgrade>().First(u=>!xp.Choices.Contains(u));xp.Choose((Upgrade)99);Check(xp.Phase==Phase.Upgrade,"invalid enum rejected");xp.Choose(notOffered);Check(xp.Phase==Phase.Upgrade,"valid but unoffered choice rejected");xp.Choose(offer);Check(xp.Phase==Phase.Playing&&xp.UpgradeStacks(offer)==1,"offered choice applies exactly once");
        var build=Started(441);Upgrade[] targetBuild={Upgrade.VectorDrive,Upgrade.PhaseReturn,Upgrade.Cadence,Upgrade.SplitCharge,Upgrade.Magnet,Upgrade.GravityWell,Upgrade.Power,Upgrade.ArmorBreaker};
        for(int n=0;n<36&&build.Phase==Phase.Playing;n++){build.Enemies.Clear();for(int i=0;i<build.XpNeeded;i++)build.Gems.Add(build.Position);build.Step(new Vec(),false);if(build.Phase==Phase.Upgrade){Upgrade desired=targetBuild.FirstOrDefault(u=>build.UpgradeStacks(u)==0&&build.Choices.Contains(u));build.Choose(targetBuild.Contains(desired)&&build.Choices.Contains(desired)?desired:build.Choices[0]);}}
        Check(build.AwakenedPhaseNova&&Math.Abs(build.PhaseReturnRadius-3.25f)<.001f&&build.AwakenedArcTempest&&Math.Abs(build.SplitChargeMultiplier-.72f)<.001f,"Vector + Phase and Cadence + Split synergies match authored values");
        Check(build.AwakenedSingularity&&Math.Abs(build.GravityWellRadius-BalanceConfig.GravityWellBaseRadius*1.25f)<.001f&&build.AwakenedThermalLance&&build.PiercingActive,"Singularity and Thermal Lance awakenings activate");
        Check(build.DashCooldownDuration<BalanceConfig.DashCooldown,"Vector upgrade improves every future dash recharge");
        Check(build.Phase==Phase.Playing,"empty upgrade pool does not strand the run");
        for(int i=0;i<UpgradeCatalog.Entries.Count;i++)Check(UpgradeCatalog.Get(UpgradeCatalog.Entries[i].Id)!=null,"catalog entry resolves "+i);
        var catalogs=UpgradeCatalog.Entries;Check(catalogs.Count==12&&catalogs.Count(x=>x.Tier==UpgradeTier.Silver)==5&&catalogs.Count(x=>x.Tier==UpgradeTier.Gold)==6&&catalogs.Count(x=>x.Tier==UpgradeTier.Prismatic)==1,"catalog has intended 5/6/1 tier structure (12 upgrades)");
        var lancer=Started(77,ChassisId.LancerDart);Check(lancer.MaxHp==82f&&lancer.PiercingActive&&lancer.MoveSpeed>BalanceConfig.PlayerSpeed,"Lancer Dart chassis initializes piercing and high speed");
        var carrier=Started(77,ChassisId.BastionCarrier);Check(carrier.MaxHp==122f&&carrier.ActiveOrbitals==1,"Bastion Carrier chassis starts with 1 orbital prism and 122 hull");
        carrier.Enemies.Clear();var orbTarget=new Enemy{Id=99,Kind=EnemyKind.Drone,Position=carrier.GetOrbitalPosition(0,1),Hp=30f,Speed=0f,Radius=.38f,Telegraph=0f};carrier.Enemies.Add(orbTarget);
        carrier.Step(new Vec(),false);
        Check(!carrier.Enemies.Contains(orbTarget)||orbTarget.Hp<30f,"Orbital prism damages nearby hostiles");
        uint daily1=Run.ComputeDailySeed(2026,11,14);uint daily2=Run.ComputeDailySeed(2026,11,14);uint dailyNext=Run.ComputeDailySeed(2026,11,15);
        Check(daily1==daily2&&daily1!=dailyNext&&daily1!=0,"Daily observatory seed is deterministic per calendar date");
        Check(WaveDirector.SpawnInterval(130)<WaveDirector.SpawnInterval(115)&&WaveDirector.ActiveCap(130)>0,"boss phase retains a paced wave budget");
        var w=Started(987);TickTo(w,126);Check(w.WardenSpawned&&w.WardenHp==BalanceConfig.WardenHealth,"warden spawns at authored time");TickTo(w,126.9f);Check(w.BossAttackSerial==1&&w.HostileShots.Count==BalanceConfig.WardenVolleyCount-1,"warden radial volley preserves one readable safe gap");
        var firstGap=new Vec((float)Math.Cos(Math.PI/8),(float)Math.Sin(Math.PI/8));Check(w.HostileShots.All(s=>{float dot=(s.Velocity.X*firstGap.X+s.Velocity.Y*firstGap.Y)/s.Velocity.Length;return dot<.72f;}),"first volley leaves its previewed 90-degree lane clear");
        float nextLaneAngle=(float)Math.Atan2(w.WardenSafeLaneDirection.Y,w.WardenSafeLaneDirection.X);Check(Math.Cos(nextLaneAngle+Math.PI/2)<.5f,"warden safe lane is not aimed at the stationary player");TickTo(w,129.9f);Check(w.BossAttackSerial==2&&Math.Abs(w.WardenSafeLaneDirection.X-firstGap.X)+Math.Abs(w.WardenSafeLaneDirection.Y-firstGap.Y)>.5f,"safe lane rotates deterministically between telegraphed volleys");
        var volley=Started(99);for(int i=0;i<BalanceConfig.WardenVolleyCount;i++)volley.HostileShots.Add(new HostileShot{Position=volley.Position,Radius=.4f,Damage=BalanceConfig.WardenProjectileDamage,Remaining=1});volley.Step(new Vec(),false);Check(volley.Hp==BalanceConfig.PlayerMaxHp-BalanceConfig.WardenProjectileDamage,"one volley cannot bypass shared hit invulnerability");
        var dashShield=Started(100);dashShield.Step(new Vec(),true);dashShield.HostileShots.Add(new HostileShot{Position=dashShield.Position,Radius=.4f,Damage=BalanceConfig.WardenProjectileDamage,Remaining=1});dashShield.Step(new Vec(),false);Check(dashShield.Hp==BalanceConfig.PlayerMaxHp,"dash invulnerability absorbs a boss projectile");
        var cap=Started(88);for(int i=0;i<5000&&cap.Time<165&&cap.Phase==Phase.Playing;i++)cap.Step(new Vec(),false);Check(cap.Enemies.Count<=WaveDirector.ActiveCap(cap.Time)+1,"enemy population stays near phase cap");
        var lose=Started(5);while(lose.Time<179.9f&&lose.Phase==Phase.Playing){lose.Enemies.Clear();lose.Gems.Clear();lose.Step(new Vec(),false);}Check(lose.Phase==Phase.Playing,"survival alone does not finish without extraction");while(lose.Phase==Phase.Playing)lose.Step(new Vec(),false);Check(lose.Phase==Phase.Lost&&lose.FailureReason=="extraction","missed extraction is a clear failure");
        var win=Started(6);win.Step(new Vec(0,1),false); // approach extraction while the arena bounds stay valid
        for(int i=0;i<10810&&win.Phase==Phase.Playing;i++){win.Enemies.Clear();win.Gems.Clear();var m=win.Position.Y<16?new Vec(0,1):new Vec();win.Step(m,false);}
        Check(win.Phase==Phase.Won&&win.ExtractionDistance<=BalanceConfig.ExtractionRadius,"reaching extraction completes run");
        var invalid=Started();invalid.Step(new Vec(float.NaN,float.PositiveInfinity),false);Check(!float.IsNaN(invalid.Position.X),"non-finite input is sanitized");
        Console.WriteLine("CORE CHECKS: "+count+" passed. Unity rendering/device certification NOT assessed.");
    }
}
