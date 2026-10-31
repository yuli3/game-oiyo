/**
 * engine.ts
 *
 * OIYO Web-Unity Engine Unified SDK (v2.0 ~ v5.0 Core Barrel)
 *
 * Provides a single, strongly-typed entrypoint to all platform engine subsystems:
 * - v2.0 Core: Timestep, ZeroGcPool, Dijkstra, ViewCone, VerletPendulum, SailThrust, FmodMix, Easing, UtilityAI, SeededRng, Pity, QualityTier
 * - v3.0 Render: RingBuffer, Bitmask, SdfLightField2D, AtlasBaker
 * - v3.5 World: FallingSand, XpbdSoftBody, WaveFunctionCollapse, VoronoiBiome
 * - v4.0 Net & Tools: ReplayTape, GhostSampler, GizmoInspector, LockstepSession, Fnv1a
 * - v5.0 Extreme: ArchetypeEcs, FabrikIK, VoronoiShatter, SteeringBoids, BehaviorTree, FormantVoice, PostProcess, Splines, SaveVault, MonteCarloBalance
 */

// v2.0 Subsystems
export * from "./engine-v2";

// v3.0 Render Subsystems
export * from "./engine-v3-render";

// v3.5 World & Simulation Subsystems
export * from "./engine-v35-world";

// v4.0 Network & Tooling Subsystems
export * from "./engine-v4-net-tools";

// v5.0 Extreme Subsystems
export * from "./engine-v5";

// Runtime Supervisor
export * from "./studio-engine-runtime";

// Native Game-Feel & Juice Engine
export * from "./game-juice";
