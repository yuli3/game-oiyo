// VERTICAL SLICE + G3 EXPANSION — validates the three-minute Neon Survivor loop with Chassis, Orbitals, Awakenings, Tactical Hostiles, Boss Rotation, and Daily Seed.
using System;
using System.Collections.Generic;

namespace Oiyo.Neon
{
    public enum Phase { Briefing, Playing, Paused, Upgrade, Won, Lost }
    public enum Upgrade { Power, Cadence, Hull, Magnet, VectorDrive, PhaseReturn, SplitCharge, EventHorizon, OrbitalPrism, GravityWell, ArmorBreaker, ChronoStep }
    public enum EnemyKind { Drone, Skitter, Bastion, Warden, TetherWeaver, NullLeech, SolarArchitect }
    public struct Vec
    {
        public float X, Y;
        public Vec(float x, float y) { X=x; Y=y; }
        public float Length => (float)Math.Sqrt(X*X+Y*Y);
        public Vec Unit => Length>.0001f ? this*(1/Length) : new Vec(1,0);
        public static Vec operator +(Vec a,Vec b)=>new Vec(a.X+b.X,a.Y+b.Y);
        public static Vec operator -(Vec a,Vec b)=>new Vec(a.X-b.X,a.Y-b.Y);
        public static Vec operator *(Vec a,float b)=>new Vec(a.X*b,a.Y*b);
    }
    public sealed class Enemy
    {
        public int Id; public EnemyKind Kind; public Vec Position; public float Hp,Speed,Radius,Telegraph,HitFlash;
        public int AbsorbedGems;
        internal float StrafePhase;
    }
    public sealed class HostileShot { public Vec Position, Velocity; public float Radius, Damage, Remaining; }
    public sealed class Run
    {
        public const float StepSeconds=BalanceConfig.StepSeconds, Duration=BalanceConfig.RunDuration;
        public const float HalfWidth=BalanceConfig.HalfWidth, HalfHeight=BalanceConfig.HalfHeight;
        public Phase Phase { get; private set; }=Phase.Briefing;
        public ChassisId Chassis { get; private set; }
        public bool IsDailyRun { get; private set; }
        public EnemyKind ActiveBossKind => (Seed & 1u) == 0u ? EnemyKind.SolarArchitect : EnemyKind.Warden;
        public float ActiveBossMaxHp => ActiveBossKind == EnemyKind.SolarArchitect ? BalanceConfig.ArchitectHealth : BalanceConfig.WardenHealth;
        public Vec Position { get; private set; } public Vec Facing { get; private set; }=new Vec(1,0);
        public float Time { get; private set; } public float Hp { get; private set; }
        public float MaxHp { get; private set; }
        public float DashTime { get; private set; } public float DashCooldown { get; private set; }
        public int Kills { get; private set; } public int Level { get; private set; }=1;
        public float Damage { get; private set; }
        public float FireInterval { get; private set; }
        public float MoveSpeed { get; private set; }
        public float DashCooldownDuration { get; private set; }
        public float MagnetRange { get; private set; }=BalanceConfig.PickupMagnetRange;
        public float WardenHp { get; private set; } public bool WardenSpawned { get; private set; }
        public bool WardenDefeated { get; private set; } public bool WardenWarning { get; private set; }
        public Vec WardenSafeLaneDirection { get; private set; }=new Vec(.94f,.34f);
        public bool HasActiveTether { get; private set; }
        public Vec TetherStart { get; private set; }
        public Vec TetherEnd { get; private set; }
        public bool ExtractionActive => Time>=BalanceConfig.ExtractionStart && Phase==Phase.Playing;
        public Vec ExtractionPosition => new Vec(0,HalfHeight-3);
        public float ExtractionDistance => (Position-ExtractionPosition).Length;
        public bool IsBonusChoice { get; private set; }
        public string FailureReason { get; private set; }
        public uint Seed { get; private set; }
        public EnemyKind LastHitTargetKind { get; private set; }
        public int Shots { get; private set; } public int XpProgress => xp;
        public int XpNeeded => BalanceConfig.XpForNextLevel(Level);
        public Vec LastShotTarget { get; private set; } public int ShotSerial { get; private set; }
        public int DashSerial { get; private set; } public int BossAttackSerial { get; private set; }
        public int LastHitSerial { get; private set; } public int LastPickupSerial { get; private set; }
        public int LastKillSerial { get; private set; }
        public int PhaseReturnStacks => Stack(Upgrade.PhaseReturn);
        public int SplitChargeStacks => Stack(Upgrade.SplitCharge);
        public int OrbitalPrismStacks => Stack(Upgrade.OrbitalPrism);
        public int GravityWellStacks => Stack(Upgrade.GravityWell);
        public int ArmorBreakerStacks => Stack(Upgrade.ArmorBreaker);
        public int ChronoStepStacks => Stack(Upgrade.ChronoStep);
        public int ActiveOrbitals => BalanceConfig.GetChassis(Chassis).BaseOrbitals + OrbitalPrismStacks;
        public float OrbitalAngle { get; private set; }
        public bool PiercingActive => BalanceConfig.GetChassis(Chassis).PiercingShots || AwakenedThermalLance;
        public bool AwakenedPhaseNova => Stack(Upgrade.VectorDrive)>0 && Stack(Upgrade.PhaseReturn)>0;
        public bool AwakenedArcTempest => Stack(Upgrade.Cadence)>0 && Stack(Upgrade.SplitCharge)>0;
        public bool AwakenedSingularity => Stack(Upgrade.Magnet)>0 && Stack(Upgrade.GravityWell)>0;
        public bool AwakenedThermalLance => Stack(Upgrade.Power)>0 && Stack(Upgrade.ArmorBreaker)>0;
        public int AwakeningCount => (AwakenedPhaseNova?1:0)+(AwakenedArcTempest?1:0)+(AwakenedSingularity?1:0)+(AwakenedThermalLance?1:0);
        public float PhaseReturnRadius => 2.6f*(AwakenedPhaseNova ? 1.25f : 1f);
        public float SplitChargeMultiplier => .6f*(AwakenedArcTempest ? 1.2f : 1f);
        public float GravityWellRadius => BalanceConfig.GravityWellBaseRadius*(AwakenedSingularity ? 1.25f : 1f);
        public bool HasEventHorizon => Stack(Upgrade.EventHorizon)>0;
        public bool WardenAttackTelegraph => WardenSpawned&&!WardenDefeated&&wardenAttackClock>0&&wardenAttackClock<=BalanceConfig.WardenAttackTell;
        public readonly List<Enemy> Enemies=new List<Enemy>(32);
        public readonly List<Vec> Gems=new List<Vec>(64);
        public readonly List<HostileShot> HostileShots=new List<HostileShot>(32);
        readonly List<Upgrade> choices=new List<Upgrade>(3);
        readonly List<Upgrade> choicePool=new List<Upgrade>(12);
        readonly Dictionary<Upgrade,int> stacks=new Dictionary<Upgrade,int>(12);
        uint random; int nextId,xp; float spawnClock,fireClock,hurtClock,wardenContactClock,wardenAttackClock,orbitalClock;
        public IReadOnlyList<Upgrade> Choices=>choices;

        public Run(uint seed, ChassisId chassis = ChassisId.AegisProbe, bool isDailyRun = false)
        {
            Reset(seed, chassis, isDailyRun);
        }

        // WHY (2026-11-14): Reset in-place so 20+ consecutive restarts reuse existing Enemy/Gem/HostileShot list buffers without GC heap churn.
        public void Reset(uint seed, ChassisId chassis = ChassisId.AegisProbe, bool isDailyRun = false)
        {
            Seed=seed==0?1u:seed; random=Seed;
            Chassis=chassis; IsDailyRun=isDailyRun;
            Phase=Phase.Briefing;
            Position=new Vec(0,0); Facing=new Vec(1,0);
            Time=0; DashTime=0; DashCooldown=0;
            Kills=0; Level=1; xp=0; nextId=0;
            MagnetRange=BalanceConfig.PickupMagnetRange;
            WardenHp=0; WardenSpawned=false; WardenDefeated=false; WardenWarning=false;
            WardenSafeLaneDirection=new Vec(.94f,.34f);
            HasActiveTether=false; TetherStart=new Vec(); TetherEnd=new Vec();
            IsBonusChoice=false; FailureReason=null;
            LastHitTargetKind=EnemyKind.Drone;
            Shots=0; LastShotTarget=new Vec();
            ShotSerial=0; DashSerial=0; BossAttackSerial=0;
            LastHitSerial=0; LastPickupSerial=0; LastKillSerial=0;
            OrbitalAngle=0;
            spawnClock=0; fireClock=0; hurtClock=0; wardenContactClock=0; wardenAttackClock=0; orbitalClock=0;
            Enemies.Clear(); Gems.Clear(); HostileShots.Clear(); choices.Clear(); stacks.Clear();
            var spec=BalanceConfig.GetChassis(chassis);
            MaxHp=spec.MaxHp; Hp=spec.MaxHp;
            MoveSpeed=spec.MoveSpeed; DashCooldownDuration=spec.DashCooldown;
            Damage=spec.Damage; FireInterval=spec.FireInterval;
        }

        public string BuildTelemetryCode()
        {
            string grade = (Phase == Phase.Won && WardenDefeated) ? "S"
                : Phase == Phase.Won ? "A"
                : (WardenDefeated || Time >= 150f) ? "B"
                : Time >= 90f ? "C" : "D";
            string ch = Chassis == ChassisId.LancerDart ? "LAN" : Chassis == ChassisId.BastionCarrier ? "CAR" : "AEG";
            string mode = IsDailyRun ? "D" : "S";
            return $"NEON-v1|{mode}{Seed}|{ch}|{grade}|{(int)Time}s|K{Kills}|L{Level}|W{AwakeningCount}";
        }

        public static uint ComputeDailySeed(int year, int month, int day)
        {
            uint h = (uint)(year * 10000 + month * 100 + day);
            h ^= h >> 16; h *= 0x7feb352du; h ^= h >> 15; h *= 0x846ca68bu; h ^= h >> 16;
            return h == 0 ? 20261114u : h;
        }

        public static bool IsBoss(EnemyKind kind) => kind == EnemyKind.Warden || kind == EnemyKind.SolarArchitect;
        public static bool IsArmored(EnemyKind kind) => kind == EnemyKind.Bastion || IsBoss(kind);

        public void Start(){if(Phase==Phase.Briefing)Phase=Phase.Playing;}
        public void Pause(){if(Phase==Phase.Playing)Phase=Phase.Paused;}
        public void Resume(){if(Phase==Phase.Paused)Phase=Phase.Playing;}
        int Stack(Upgrade id)=>stacks.TryGetValue(id,out int n)?n:0;
        public int UpgradeStacks(Upgrade id)=>Stack(id);
        public void Choose(Upgrade upgrade)
        {
            if(Phase!=Phase.Upgrade||!choices.Contains(upgrade))return;
            var spec=UpgradeCatalog.Get(upgrade); if(spec==null||Stack(upgrade)>=spec.MaxStacks)return;
            stacks[upgrade]=Stack(upgrade)+1;
            switch(upgrade)
            {
                case Upgrade.Power: Damage*=1+spec.Magnitude; break;
                case Upgrade.Cadence: FireInterval=Math.Max(.15f,FireInterval*(1-spec.Magnitude)); break;
                case Upgrade.Hull: MaxHp+=spec.Magnitude; Hp=Math.Min(MaxHp,Hp+26); break;
                case Upgrade.Magnet: MagnetRange+=spec.Magnitude; FireInterval=Math.Max(.15f,FireInterval*.92f); MoveSpeed*=1.03f; break;
                case Upgrade.VectorDrive: MoveSpeed*=1+spec.Magnitude; DashCooldownDuration*=.92f; break;
                case Upgrade.PhaseReturn: DashCooldownDuration*=.97f; break;
                case Upgrade.EventHorizon: Damage*=1+spec.Magnitude; FireInterval*=.93f; MoveSpeed*=.76f; DashCooldownDuration*=1.10f; break;
                case Upgrade.OrbitalPrism: FireInterval=Math.Max(.15f,FireInterval*.97f); break;
                case Upgrade.GravityWell: MagnetRange+=.40f; FireInterval=Math.Max(.15f,FireInterval*.98f); break;
                case Upgrade.ArmorBreaker: Damage*=1.03f; break;
                case Upgrade.ChronoStep: DashCooldownDuration*=.94f; MoveSpeed*=1.02f; break;
            }
            choices.Clear(); IsBonusChoice=false; Phase=Phase.Playing;
        }
        float Random01(){random^=random<<13;random^=random>>17;random^=random<<5;return(random>>8)/16777216f;}
        Enemy MakeEnemy(EnemyKind kind,Vec position)
        {
            float hp=kind==EnemyKind.Bastion?BalanceConfig.BastionHp:
                     kind==EnemyKind.Skitter?BalanceConfig.SkitterHp:
                     kind==EnemyKind.TetherWeaver?BalanceConfig.WeaverHp:
                     kind==EnemyKind.NullLeech?BalanceConfig.LeechHp:
                     kind==EnemyKind.SolarArchitect?BalanceConfig.ArchitectHealth:
                     kind==EnemyKind.Warden?BalanceConfig.WardenHealth:BalanceConfig.DroneHp;
            float speed=kind==EnemyKind.Bastion?BalanceConfig.BastionSpeed:
                        kind==EnemyKind.Skitter?BalanceConfig.SkitterSpeed:
                        kind==EnemyKind.TetherWeaver?BalanceConfig.WeaverSpeed:
                        kind==EnemyKind.NullLeech?BalanceConfig.LeechSpeed:
                        kind==EnemyKind.SolarArchitect?BalanceConfig.ArchitectSpeed:
                        kind==EnemyKind.Warden?BalanceConfig.WardenSpeed:BalanceConfig.DroneSpeed;
            float radius=kind==EnemyKind.Bastion?BalanceConfig.BastionRadius:
                         kind==EnemyKind.Skitter?BalanceConfig.SkitterRadius:
                         kind==EnemyKind.TetherWeaver?BalanceConfig.WeaverRadius:
                         kind==EnemyKind.NullLeech?BalanceConfig.LeechRadius:
                         kind==EnemyKind.SolarArchitect?BalanceConfig.ArchitectRadius:
                         kind==EnemyKind.Warden?BalanceConfig.WardenRadius:BalanceConfig.DroneRadius;
            return new Enemy{Id=++nextId,Kind=kind,Position=position,Hp=hp,Speed=speed,Radius=radius,Telegraph=.6f};
        }
        public Vec GetOrbitalPosition(int index, int count)
        {
            float angle = OrbitalAngle + (float)(Math.PI * 2 * index / Math.Max(1, count));
            return new Vec(Position.X + (float)Math.Cos(angle) * BalanceConfig.OrbitalRadius,
                           Position.Y + (float)Math.Sin(angle) * BalanceConfig.OrbitalRadius);
        }
        public void Step(Vec move,bool dash)
        {
            if(Phase!=Phase.Playing)return;
            if(!Finite(move.X)||!Finite(move.Y))move=new Vec();
            const float dt=StepSeconds; if(move.Length>1)move=move.Unit;
            if(move.Length>.05f)Facing=move.Unit;
            Vec departurePos=Position;
            bool dashStarted=dash&&DashCooldown<=0;
            if(dashStarted){DashTime=BalanceConfig.DashDuration;DashCooldown=DashCooldownDuration;DashSerial++;}
            float burst=Math.Min(dt,DashTime);Vec direction=DashTime>0?Facing:move;
            Vec p=Position+direction*(MoveSpeed*(dt+burst*1.6f));
            Position=new Vec(Clamp(p.X,-HalfWidth,HalfWidth),Clamp(p.Y,-HalfHeight,HalfHeight));
            bool invulnerable=DashTime>0;DashTime=Math.Max(0,DashTime-dt);DashCooldown=Math.Max(0,DashCooldown-dt);
            hurtClock=Math.Max(0,hurtClock-dt);wardenContactClock=Math.Max(0,wardenContactClock-dt);Time+=dt;
            OrbitalAngle+=BalanceConfig.OrbitalAngularSpeed*dt;
            WardenWarning=Time>=BalanceConfig.WardenWarningAt&&!WardenSpawned;
            spawnClock-=dt;
            bool wardenJustSpawned=false;
            if(!WardenSpawned&&Time>=BalanceConfig.WardenSpawnAt)
            {
                WardenSpawned=true;wardenJustSpawned=true;
                var bossKind=ActiveBossKind;
                WardenHp=ActiveBossMaxHp;
                wardenAttackClock=BalanceConfig.WardenAttackTell;
                WardenSafeLaneDirection=SafeLaneFor(BossAttackSerial);
                Enemies.Add(MakeEnemy(bossKind,new Vec(0,HalfHeight+5)));
            }
            if(spawnClock<=0&&Enemies.Count<WaveDirector.ActiveCap(Time)&&Time<Duration)
            {float a=Random01()*(float)Math.PI*2;var kind=WaveDirector.Choose(Time,Random01());Enemies.Add(MakeEnemy(kind,new Vec((float)Math.Cos(a)*(HalfWidth+3),(float)Math.Sin(a)*(HalfHeight+3))));spawnClock=WaveDirector.SpawnInterval(Time);}
            Enemy nearest=null;float nearestDistance=float.MaxValue;
            float wellRadius=GravityWellRadius;
            Enemy firstWeaver=null, secondWeaver=null;
            for(int i=0;i<Enemies.Count;i++)
            {
                var e=Enemies[i];e.Telegraph=Math.Max(0,e.Telegraph-dt);e.HitFlash=Math.Max(0,e.HitFlash-dt);
                Vec delta=Position-e.Position;float d=delta.Length;
                if(e.Telegraph<=0)
                {
                    float slowFactor = (GravityWellStacks>0 && d<wellRadius)
                        ? Math.Max(.45f, 1f - BalanceConfig.GravityWellSlowPerStack * GravityWellStacks - (AwakenedSingularity ? .08f : 0f))
                        : 1f;
                    float effSpeed = e.Speed * slowFactor;
                    if(e.Kind==EnemyKind.Skitter)
                    {Vec lateral=new Vec(-delta.Unit.Y,delta.Unit.X);e.StrafePhase+=dt*3.8f;e.Position+=delta.Unit*(effSpeed*.72f*dt)+lateral*((float)Math.Sin(e.StrafePhase)*effSpeed*.42f*dt);}
                    else if(e.Kind==EnemyKind.NullLeech&&Gems.Count>0&&e.AbsorbedGems<2)
                    {
                        int nearGem=-1;float gDist=7.5f;
                        for(int g=0;g<Gems.Count;g++){float gd=(Gems[g]-e.Position).Length;if(gd<gDist){gDist=gd;nearGem=g;}}
                        if(nearGem>=0)
                        {
                            Vec toGem=(Gems[nearGem]-e.Position).Unit;
                            e.Position+=toGem*(effSpeed*1.12f*dt);
                            if((Gems[nearGem]-e.Position).Length<.6f)
                            {Gems.RemoveAt(nearGem);e.AbsorbedGems++;e.Hp+=12f;e.Radius+=.05f;}
                        }
                        else e.Position+=delta.Unit*(effSpeed*dt);
                    }
                    else e.Position+=delta.Unit*(effSpeed*dt);
                    d=(Position-e.Position).Length;
                    if(d<nearestDistance){nearest=e;nearestDistance=d;}
                    if(e.Kind==EnemyKind.TetherWeaver)
                    {
                        if(firstWeaver==null)firstWeaver=e;
                        else if(secondWeaver==null&&(e.Position-firstWeaver.Position).Length<=BalanceConfig.WeaverTetherRange)secondWeaver=e;
                    }
                    if(d<e.Radius+.35f)
                    {
                        float damage=IsBoss(e.Kind)?BalanceConfig.WardenContactDamage:BalanceConfig.ContactDamage;
                        if((IsBoss(e.Kind)?wardenContactClock:hurtClock)<=0&&!invulnerable)
                        {Hp=Math.Max(0,Hp-damage);if(IsBoss(e.Kind))wardenContactClock=BalanceConfig.WardenContactCooldown;else hurtClock=BalanceConfig.ContactInvulnerability;LastHitSerial++;}
                    }
                }
            }
            HasActiveTether = firstWeaver != null && secondWeaver != null;
            if(HasActiveTether)
            {
                TetherStart=firstWeaver.Position;TetherEnd=secondWeaver.Position;
                Vec seg=TetherEnd-TetherStart;float segLenSq=seg.X*seg.X+seg.Y*seg.Y;
                if(segLenSq>.01f&&!invulnerable&&hurtClock<=0)
                {
                    float t=Clamp(((Position.X-TetherStart.X)*seg.X+(Position.Y-TetherStart.Y)*seg.Y)/segLenSq,0f,1f);
                    Vec closest=TetherStart+seg*t;
                    if((Position-closest).Length<.42f)
                    {Hp=Math.Max(0,Hp-BalanceConfig.WeaverTetherDamage);hurtClock=BalanceConfig.ContactInvulnerability;LastHitSerial++;}
                }
            }
            if(dashStarted&&PhaseReturnStacks>0)
                foreach(var e in Enemies)if((e.Position-Position).Length<PhaseReturnRadius){e.Hp-=22*PhaseReturnStacks;e.HitFlash=.12f;e.Position=e.Position+(e.Position-Position).Unit*(1.05f*PhaseReturnStacks);}
            if(dashStarted&&ChronoStepStacks>0)
                foreach(var e in Enemies)if((e.Position-departurePos).Length<3.1f){e.Hp-=16*ChronoStepStacks;e.HitFlash=.12f;}
            if(ActiveOrbitals>0)
            {
                orbitalClock-=dt;
                if(orbitalClock<=0)
                {
                    orbitalClock=BalanceConfig.OrbitalTickInterval;
                    int count=ActiveOrbitals;
                    float orbDmg=BalanceConfig.OrbitalBaseDamage+(OrbitalPrismStacks>1?5f:0f);
                    for(int k=0;k<count;k++)
                    {
                        Vec orbPos=GetOrbitalPosition(k,count);
                        foreach(var e in Enemies)
                        {
                            if(e.Telegraph<=0&&(e.Position-orbPos).Length<e.Radius+.62f)
                            {
                                e.Hp-=orbDmg;e.HitFlash=.09f;
                                if(IsBoss(e.Kind))WardenHp=Math.Max(0,e.Hp);
                            }
                        }
                    }
                }
            }
            if(!wardenJustSpawned)UpdateWardenVolley(dt);
            for(int i=HostileShots.Count-1;i>=0;i--)
            {var s=HostileShots[i];s.Position+=s.Velocity*dt;s.Remaining-=dt;if((s.Position-Position).Length<s.Radius+.3f){if(!invulnerable&&hurtClock<=0){Hp=Math.Max(0,Hp-s.Damage);LastHitSerial++;hurtClock=BalanceConfig.ContactInvulnerability;}HostileShots.RemoveAt(i);}else if(s.Remaining<=0)HostileShots.RemoveAt(i);}
            fireClock=Math.Max(0,fireClock-dt);
            if(nearest!=null&&nearestDistance<(IsBoss(nearest.Kind)?16:10)&&fireClock<=0)
            {
                float armorBonus=(ArmorBreakerStacks>0&&IsArmored(nearest.Kind)) ? (1f+.14f*ArmorBreakerStacks) : 1f;
                float dealt=Damage*armorBonus;
                nearest.Hp-=dealt;nearest.HitFlash=.1f;LastHitTargetKind=nearest.Kind;
                LastShotTarget=nearest.Position;Shots++;ShotSerial++;fireClock=FireInterval;
                if(IsBoss(nearest.Kind))WardenHp=Math.Max(0,nearest.Hp);
                if(PiercingActive)
                {
                    Vec rayDir=(nearest.Position-Position).Unit;
                    foreach(var e in Enemies)
                    {
                        if(e!=nearest&&e.Hp>0&&e.Telegraph<=0)
                        {
                            Vec toE=e.Position-Position;
                            float proj=toE.X*rayDir.X+toE.Y*rayDir.Y;
                            if(proj>0&&proj<9.5f)
                            {
                                Vec perp=toE-rayDir*proj;
                                if(perp.Length<e.Radius+.42f)
                                {
                                    e.Hp-=dealt*.38f;e.HitFlash=.1f;
                                    if(IsBoss(e.Kind))WardenHp=Math.Max(0,e.Hp);
                                    break;
                                }
                            }
                        }
                    }
                }
                if(SplitChargeStacks>0&&Shots%(SplitChargeStacks==1?4:3)==0)
                {Enemy other=null;float d0=4.5f;foreach(var e in Enemies)if(e!=nearest&&e.Hp>0){float d1=(e.Position-nearest.Position).Length;if(d1<d0){other=e;d0=d1;}}if(other!=null){other.Hp-=Damage*SplitChargeMultiplier;other.HitFlash=.1f;if(IsBoss(other.Kind))WardenHp=Math.Max(0,other.Hp);}}
            }
            for(int i=Enemies.Count-1;i>=0;i--)if(Enemies[i].Hp<=0)
            {
                var e=Enemies[i];bool boss=IsBoss(e.Kind);
                int dropCount = 1 + e.AbsorbedGems;
                for(int g=0;g<dropCount;g++)Gems.Add(e.Position + new Vec((g*0.18f),0));
                Enemies.RemoveAt(i);Kills++;LastKillSerial++;
                if(boss){WardenHp=0;WardenDefeated=true;HostileShots.Clear();RollChoices(true);if(choices.Count>0)Phase=Phase.Upgrade;}
            }
            for(int i=Gems.Count-1;i>=0;i--)
            {Vec delta=Position-Gems[i];if(delta.Length<BalanceConfig.PickupCollectRange){xp++;Gems.RemoveAt(i);LastPickupSerial++;}else if(delta.Length<MagnetRange)Gems[i]+=delta.Unit*(BalanceConfig.PickupSpeed*dt);}
            if(Hp<=0){FailureReason="hull";Phase=Phase.Lost;}
            else if(Time>=Duration){if(ExtractionDistance<=BalanceConfig.ExtractionRadius)Phase=Phase.Won;else{FailureReason="extraction";Phase=Phase.Lost;}}
            else if(Phase==Phase.Playing&&xp>=XpNeeded){xp-=XpNeeded;Level++;RollChoices(false);if(choices.Count>0)Phase=Phase.Upgrade;}
        }
        void UpdateWardenVolley(float dt)
        {
            if(!WardenSpawned||WardenDefeated)return;
            wardenAttackClock-=dt;
            if(wardenAttackClock<=0)
            {
                Enemy boss=null;for(int i=0;i<Enemies.Count;i++)if(IsBoss(Enemies[i].Kind)){boss=Enemies[i];break;}
                if(boss==null)return;
                // WHY (2026-11-14): both Warden and Solar Architect preserve a deterministic 90-degree safe lane while rotating their volley pattern.
                WardenSafeLaneDirection=SafeLaneFor(BossAttackSerial);
                float safeAngle=(float)Math.Atan2(WardenSafeLaneDirection.Y,WardenSafeLaneDirection.X);
                float speedMult = boss.Kind == EnemyKind.SolarArchitect ? 1.06f : 1f;
                for(int i=1;i<BalanceConfig.WardenVolleyCount;i++){float a=safeAngle+(float)(Math.PI*2*i/BalanceConfig.WardenVolleyCount);HostileShots.Add(new HostileShot{Position=boss.Position,Velocity=new Vec((float)Math.Cos(a)*BalanceConfig.WardenProjectileSpeed*speedMult,(float)Math.Sin(a)*BalanceConfig.WardenProjectileSpeed*speedMult),Radius=BalanceConfig.WardenProjectileRadius,Damage=BalanceConfig.WardenProjectileDamage,Remaining=BalanceConfig.WardenProjectileLifetime});}
                BossAttackSerial++;WardenSafeLaneDirection=SafeLaneFor(BossAttackSerial);wardenAttackClock=BalanceConfig.WardenAttackInterval;
            }
        }
        static Vec SafeLaneFor(int volley)
        {
            float angle=(float)(Math.PI/8+Math.PI*2*volley/BalanceConfig.WardenVolleyCount);
            return new Vec((float)Math.Cos(angle),(float)Math.Sin(angle));
        }
        void RollChoices(bool bonus)
        {
            choices.Clear();IsBonusChoice=bonus;choicePool.Clear();
            foreach(var spec in UpgradeCatalog.Entries)if(Stack(spec.Id)<spec.MaxStacks)choicePool.Add(spec.Id);
            while(choices.Count<BalanceConfig.UpgradeChoices&&choicePool.Count>0)
            {
                int total=0;foreach(var id in choicePool)total+=UpgradeCatalog.Get(id).Tier==UpgradeTier.Silver?4:UpgradeCatalog.Get(id).Tier==UpgradeTier.Gold?3:1;
                int ticket=(int)(Random01()*total);Upgrade selected=choicePool[choicePool.Count-1];
                foreach(var id in choicePool){ticket-=UpgradeCatalog.Get(id).Tier==UpgradeTier.Silver?4:UpgradeCatalog.Get(id).Tier==UpgradeTier.Gold?3:1;if(ticket<0){selected=id;break;}}
                choices.Add(selected);choicePool.Remove(selected);
            }
            if(bonus){MaxHp+=BalanceConfig.CoreBonusMaxHp;Hp=Math.Min(MaxHp,Hp+BalanceConfig.CoreBonusHeal);}
        }
        static bool Finite(float n)=>!float.IsNaN(n)&&!float.IsInfinity(n);
        static float Clamp(float n,float min,float max)=>n<min?min:n>max?max:n;
    }
}
