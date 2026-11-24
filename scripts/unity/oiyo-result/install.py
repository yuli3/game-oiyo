#!/usr/bin/env python3
"""Wire Unity builds to report run results to the game.oiyo.net page.

For each build below: copies OiyoResult.cs into its Runtime folder and
OiyoResult.jslib into Plugins/WebGL (with .meta files), then inserts one
OiyoResult call as the first statement of the player's Update().
Idempotent. Run from anywhere: python3 scripts/unity/oiyo-result/install.py
Score is sent only where the game has real points; stage/day/wave counts are
not points, so those games send 0 and only the win/loss is recorded.
"""
import hashlib, re, shutil, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

# build folder: (page slug, player file relative to Assets/, call arguments after slug)
T, E = "Track", "TrackEnded"
BUILDS = {
    "aim-trainer-unity": ("aim-trainer", "AimTrainer/Runtime/AimTrainerPlayer.cs", E, "isGameOver || isVictory, isVictory, score"),
    "bad-north-tactics-unity": ("shield-isle-tactics", "BadNorth/Runtime/BadNorthPlayer.cs", T, "state, 0"),
    "beat-slice-unity": ("beat-slice-3d", "BeatSlice/Runtime/BeatSlicePlayer.cs", T, "state, score"),
    "block-blast-unity": ("grid-clear", "BlockBlast/Runtime/BlockBlastPlayer.cs", T, "state, currentScore"),
    "border-inspector-unity": ("border-inspector", "BorderInspector/Runtime/BorderInspectorPlayer.cs", E, "_stageComplete || _stageFailed, _stageComplete, 0"),
    "brick-breaker-unity": ("brick-breaker", "BrickBreaker/Runtime/BrickBreakerPlayer.cs", E, "isGameOver || isVictory, isVictory, score"),
    "cave-dash-unity": ("cave-dash", "CaveDash/Runtime/CaveDashPlayer.cs", T, "state, score"),
    "chaos-kitchen-unity": ("chaos-kitchen", "ChaosKitchen/Runtime/ChaosKitchenPlayer.cs", T, "_mode, _score"),
    "cozy-glider-unity": ("cozy-glider", "CozyGlider/Runtime/CozyGliderPlayer.cs", E, "_stageCleared || _stageFailed, _stageCleared, 0"),
    "crossy-road-unity": ("hop-across-3d", "CrossyRoad/Runtime/CrossyRoadPlayer.cs", T, "state, score"),
    "cyber-highway-unity": ("cyber-highway-3d", "CyberHighway/Runtime/CyberHighwayPlayer.cs", T, "state, score"),
    "darkest-torch-unity": ("torch-expedition", "DarkestTorch/Runtime/DarkestTorchPlayer.cs", E, "_victory || _gameOver, _victory, 0"),
    "dome-keeper-unity": ("drill-dome", "DomeKeeper/Runtime/DomeKeeperPlayer.cs", T, "_mode, _score"),
    "dot-dungeon-rogue-unity": ("dot-dungeon-rogue", "DotDungeonRogue/Runtime/DotDungeonRoguePlayer.cs", E, "isGameOver || isGameVictory, isGameVictory, playerGold"),
    "frostpunk-ring-unity": ("heat-ring-city", "FrostpunkRing/Runtime/FrostpunkPlayer.cs", E, "_victory || _gameOver, _victory, 0"),
    "gravity-roller-unity": ("gravity-roller-3d", "GravityRoller/Runtime/GravityRollerPlayer.cs", T, "state, score"),
    "mini-golf-unity": ("mini-golf-3d", "MiniGolf/Runtime/MiniGolfPlayer.cs", T, "status, 0"),
    "mini-motorways-unity": ("road-weaver", "MiniMotorways/Runtime/MiniMotorwaysPlayer.cs", E, "_victory || _gameOver, _victory, _trips"),
    "neon-unity": ("neon-survivor", "Neon/Runtime/SlicePlayer.cs", T, "run.Phase, 0"),
    "orbital-defense-unity": ("orbital-defense-3d", "OrbitalDefense/Runtime/OrbitalDefensePlayer.cs", T, "state, score"),
    "paper-flight-unity": ("paper-flight-3d", "PaperFlight/Runtime/PaperFlightPlayer.cs", T, "state, score"),
    "peglin-rogue-unity": ("peg-dungeon", "PeglinRogue/Runtime/PeglinRoguePlayer.cs", T, "state, totalScore"),
    "sand-balls-unity": ("sand-dig", "SandBalls/Runtime/SandBallsPlayer.cs", T, "state, 0"),
    "slice-master-unity": ("blade-drop-3d", "SliceMaster/Runtime/SliceMasterPlayer.cs", E, "isGameOver || isLevelClear, isLevelClear, score"),
    "slot-rogue-unity": ("slot-rogue", "SlotRogue/Runtime/SlotRoguePlayer.cs", E, "isGameOver || isVictory, isVictory, playerCoins"),
    "space-pinball-unity": ("space-pinball-3d", "SpacePinball/Runtime/SpacePinballPlayer.cs", T, "state, score"),
    "stacklands-unity": ("card-village", "Stacklands/Runtime/StacklandsPlayer.cs", E, "_victory || _gameOver, _victory, 0"),
    "star-blaster-unity": ("star-blaster", "StarBlaster/Runtime/StarBlasterPlayer.cs", T, "state, score"),
    "subway-runner-unity": ("subway-runner", "SubwayRunner/Runtime/SubwayRunnerPlayer.cs", E, "isGameOver || isVictory, isVictory, score"),
    "suika-drop-unity": ("fruit-merge-drop", "SuikaDrop/Runtime/SuikaDropPlayer.cs", T, "state, score"),
    "sushi-conveyor-unity": ("sushi-conveyor", "SushiConveyor/Runtime/SushiConveyorPlayer.cs", E, "_stageCleared || _stageFailed, _stageCleared, 0"),
    "swat-breach-unity": ("swat-breach", "SwatBreach/Runtime/SwatBreachPlayer.cs", T, "phase, totalScore"),
    "townscaper-island-unity": ("harbor-blocks", "TownscaperIsland/Runtime/TownscaperIslandPlayer.cs", E, "stageCleared, true, 0"),
    "two-hands-unity": ("two-hands", "TwoHands/Runtime/TwoHandsPlayer.cs", E, "isGameOver || isVictory, isVictory, score"),
    "viking-longship-unity": ("viking-longship", "VikingLongship/Runtime/VikingLongshipPlayer.cs", E, "_victory || _gameOver, _victory, 0"),
    "snake-game-unity": ("snake-game", "SnakeGame/Runtime/SnakeGamePlayer.cs", T, "state, score"),
    "stack-tower-unity": ("stack-tower", "StackTower/Runtime/StackTowerPlayer.cs", T, "state, score"),
    "rhythm-tap-unity": ("rhythm-tap", "RhythmTap/Runtime/RhythmTapPlayer.cs", T, "state, score"),
    "neon-katana-unity": ("neon-katana", "NeonKatana/Runtime/NeonKatanaPlayer.cs", T, "state, score"),
    "shadow-dodge-unity": ("shadow-dodge", "ShadowDodge/Runtime/ShadowDodgePlayer.cs", T, "state, score"),
    "whack-a-mole-unity": ("whack-a-mole", "WhackAMole/Runtime/WhackAMolePlayer.cs", T, "state, score"),
    "finger-hockey-unity": ("finger-hockey", "FingerHockey/Runtime/FingerHockeyPlayer.cs", T, "state, score"),
    "spin-sumo-unity": ("spin-sumo", "SpinSumo/Runtime/SpinSumoPlayer.cs", T, "state, score"),
    "snowman-stack-unity": ("snowman-stack", "SnowmanStack/Runtime/SnowmanStackPlayer.cs", T, "state, score"),
    "line-surf-unity": ("line-surf", "LineSurf/Runtime/LineSurfPlayer.cs", T, "state, score"),
    "dot-runner-unity": ("dot-runner", "DotRunner/Runtime/DotRunnerPlayer.cs", T, "state, score"),
    "charge-climb-unity": ("charge-climb", "ChargeClimb/Runtime/ChargeClimbPlayer.cs", T, "state, score"),
    "grappling-boss-unity": ("grappling-boss", "GrapplingBoss/Runtime/GrapplingBossPlayer.cs", T, "state, score"),
    "cyber-track-unity": ("cyber-track", "CyberTrack/Runtime/CyberTrackPlayer.cs", T, "state, score"),
    "trap-stairs-unity": ("trap-stairs", "TrapStairs/Runtime/TrapStairsPlayer.cs", T, "state, score"),
    "night-horde-unity": ("night-horde", "NightHorde/Runtime/NightHordePlayer.cs", T, "state, score"),
    "pressure-wash-3d-unity": ("pressure-wash-3d", "PressureWash/Runtime/PressureWashPlayer.cs", T, "state, score"),
    "urban-strike-unity": ("urban-strike", "UrbanStrike/Runtime/UrbanStrikePlayer.cs", T, "state, score"),
    "iron-tempest-unity": ("iron-tempest", "IronTempest/Runtime/IronTempestPlayer.cs", T, "state, score"),
    "shadow-stealth-unity": ("shadow-stealth", "ShadowStealth/Runtime/ShadowStealthPlayer.cs", T, "state, score"),
    "animal-pop-unity": ("animal-pop", "AnimalPop/Runtime/AnimalPopPlayer.cs", T, "state, score"),
    "cat-fishing-unity": ("cat-fishing", "CatFishing/Runtime/CatFishingPlayer.cs", T, "state, score"),
    "dot-fishing-unity": ("dot-fishing", "DotFishing/Runtime/DotFishingPlayer.cs", T, "state, gold"),
    "emberdeep-unity": ("emberdeep", "Emberdeep/Runtime/EmberdeepPlayer.cs", T, "state, score"),
    "jwibul-spin-unity": ("jwibul-spin", "JwibulSpin/Runtime/JwibulSpinPlayer.cs", T, "state, starsWon"),
    "snowball-fight-unity": ("snowball-fight", "SnowballFight/Runtime/SnowballFightPlayer.cs", T, "state, starsWon"),
    "snow-sled-unity": ("snow-sled", "SnowSled/Runtime/SnowSledPlayer.cs", T, "state, starsWon"),
    "neol-jump-unity": ("neol-jump", "NeolJump/Runtime/NeolJumpPlayer.cs", T, "state, starsWon"),
    "tuho-toss-unity": ("tuho-toss", "TuhoToss/Runtime/TuhoTossPlayer.cs", T, "state, starsWon"),
    "ice-sledge-unity": ("ice-sledge", "IceSledge/Runtime/IceSledgePlayer.cs", T, "state, starsWon"),
    "snow-roll-unity": ("snow-roll", "SnowRoll/Runtime/SnowRollPlayer.cs", T, "state, starsWon"),
    "jachigi-unity": ("jachigi", "Jachigi/Runtime/JachigiPlayer.cs", T, "state, starsWon"),
    "ski-jump-unity": ("ski-jump", "SkiJump/Runtime/SkiJumpPlayer.cs", T, "state, starsWon"),
    "bokjori-run-unity": ("bokjori-run", "BokjoriRun/Runtime/BokjoriRunPlayer.cs", T, "state, starsWon"),
    "snow-halfpipe-unity": ("snow-halfpipe", "SnowHalfpipe/Runtime/SnowHalfpipePlayer.cs", T, "state, starsWon"),
    "speed-skate-unity": ("speed-skate", "SpeedSkate/Runtime/SpeedSkatePlayer.cs", T, "state, starsWon"),
    "yeot-stretch-unity": ("yeot-stretch", "YeotStretch/Runtime/YeotStretchPlayer.cs", T, "state, starsWon"),
    "biathlon-unity": ("biathlon", "Biathlon/Runtime/BiathlonPlayer.cs", T, "state, starsWon"),
    "ice-climb-unity": ("ice-climb", "IceClimb/Runtime/IceClimbPlayer.cs", T, "state, starsWon"),
    "bobsleigh-unity": ("bobsleigh", "Bobsleigh/Runtime/BobsleighPlayer.cs", T, "state, starsWon"),
    "tug-of-war-unity": ("tug-of-war", "TugOfWar/Runtime/TugOfWarPlayer.cs", T, "state, starsWon"),
    "bridge-walk-unity": ("bridge-walk", "BridgeWalk/Runtime/BridgeWalkPlayer.cs", T, "state, starsWon"),
    "saealsim-roll-unity": ("saealsim-roll", "SaealsimRoll/Runtime/SaealsimRollPlayer.cs", T, "state, starsWon"),
    "sell-the-heat-unity": ("sell-the-heat", "SellTheHeat/Runtime/SellTheHeatPlayer.cs", T, "state, starsWon"),
    "avalanche-rescue-unity": ("avalanche-rescue", "AvalancheRescue/Runtime/AvalancheRescuePlayer.cs", T, "state, starsWon"),
    "ogokbap-sort-unity": ("ogokbap-sort", "OgokbapSort/Runtime/OgokbapSortPlayer.cs", T, "state, starsWon"),
    "chestnut-roast-unity": ("chestnut-roast", "ChestnutRoast/Runtime/ChestnutRoastPlayer.cs", T, "state, starsWon"),
    "icicle-knock-unity": ("icicle-knock", "IcicleKnock/Runtime/IcicleKnockPlayer.cs", T, "state, starsWon"),
    "ice-road-unity": ("ice-road", "IceRoad/Runtime/IceRoadPlayer.cs", T, "state, starsWon"),
    "mandu-pleat-unity": ("mandu-pleat", "ManduPleat/Runtime/ManduPleatPlayer.cs", T, "state, starsWon"),
    "kimjang-salt-unity": ("kimjang-salt", "KimjangSalt/Runtime/KimjangSaltPlayer.cs", T, "state, starsWon"),
    "hwangtae-dry-unity": ("hwangtae-dry", "HwangtaeDry/Runtime/HwangtaeDryPlayer.cs", T, "state, starsWon"),
    "yongal-scoop-unity": ("yongal-scoop", "YongalScoop/Runtime/YongalScoopPlayer.cs", T, "state, starsWon"),
    "mungpungji-seal-unity": ("mungpungji-seal", "MungpungjiSeal/Runtime/MungpungjiSealPlayer.cs", T, "state, starsWon"),
    "charye-table-unity": ("charye-table", "CharyeTable/Runtime/CharyeTablePlayer.cs", T, "state, starsWon"),
    "yeontan-relay-unity": ("yeontan-relay", "YeontanRelay/Runtime/YeontanRelayPlayer.cs", T, "state, starsWon"),
    "daljip-fire-unity": ("daljip-fire", "DaljipFire/Runtime/DaljipFirePlayer.cs", T, "state, starsWon"),
    "scarf-knit-unity": ("scarf-knit", "ScarfKnit/Runtime/ScarfKnitPlayer.cs", T, "state, starsWon"),
    "ipchun-brush-unity": ("ipchun-brush", "IpchunBrush/Runtime/IpchunBrushPlayer.cs", T, "state, starsWon"),
    "crane-count-unity": ("crane-count", "CraneCount/Runtime/CraneCountPlayer.cs", T, "state, starsWon"),
    "rink-resurface-unity": ("rink-resurface", "RinkResurface/Runtime/RinkResurfacePlayer.cs", T, "state, starsWon"),
    "holiday-ticket-unity": ("holiday-ticket", "HolidayTicket/Runtime/HolidayTicketPlayer.cs", T, "state, starsWon"),
}

MARK = "OiyoResult."
UPDATE = re.compile(r"^(?P<indent>[ \t]*)(private |protected |public )?void Update\(\)\s*\n(?P=indent)\{\n", re.M)

def guid(seed: str) -> str:
    return hashlib.md5(("oiyo-result:" + seed).encode()).hexdigest()

def write_meta(path: Path, body: str) -> None:
    meta = path.with_name(path.name + ".meta")
    if not meta.exists():
        meta.write_text(f"fileFormatVersion: 2\nguid: {guid(str(path.relative_to(ROOT)))}\n{body}")

def main() -> int:
    errors = 0
    only = set(sys.argv[1:])
    for build, (slug, player, kind, args) in BUILDS.items():
        if only and build not in only:
            continue
        assets = ROOT / "prototypes" / build / "Assets"
        player_path = assets / player
        if not player_path.exists():
            print(f"MISSING {player_path}"); errors += 1; continue
        game_dir = assets / player.split("/")[0]
        runtime = player_path.parent
        plugins = game_dir / "Plugins" / "WebGL"
        plugins.mkdir(parents=True, exist_ok=True)
        cs = runtime / "OiyoResult.cs"
        shutil.copyfile(HERE / "OiyoResult.cs", cs)
        write_meta(cs, "MonoImporter:\n  externalObjects: {}\n  serializedVersion: 2\n  defaultReferences: []\n  executionOrder: 0\n  icon: {instanceID: 0}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n")
        js = plugins / "OiyoResult.jslib"
        shutil.copyfile(HERE / "OiyoResult.jslib", js)
        write_meta(js, "")
        for folder in (game_dir / "Plugins", plugins):
            meta = folder.with_name(folder.name + ".meta")
            if not meta.exists():
                meta.write_text(f"fileFormatVersion: 2\nguid: {guid(str(folder.relative_to(ROOT)))}\nfolderAsset: yes\nDefaultImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n")
        src = player_path.read_text(encoding="utf-8")
        call = f'OiyoResult.{kind}("{slug}", {args});'
        if call in src:
            print(f"ok      {build}"); continue
        if MARK in src:
            print(f"STALE   {build}: has a different OiyoResult call, fix by hand"); errors += 1; continue
        matches = list(UPDATE.finditer(src))
        if len(matches) != 1:
            print(f"UPDATE? {build}: found {len(matches)} Update() methods"); errors += 1; continue
        m = matches[0]
        line = f"{m.group('indent')}    // Run result for the embedding OIYO page (scripts/unity/oiyo-result).\n{m.group('indent')}    {call}\n"
        player_path.write_text(src[: m.end()] + line + src[m.end():], encoding="utf-8")
        print(f"wired   {build}")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
