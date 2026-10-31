/**
 * OIYO 2.5D Hybrid Game Architecture (`hybrid-2d-3d.ts`)
 *
 * Implements Research Goal 4:
 * - Hybrid Layering: Three.js 3D Background World + Pixi / 2D Canvas Foreground Action
 * - Camera Parallax Projection Matrix Synchronizer (2D Player Vector -> 3D Camera Frustum & Bank Tilt)
 * - Zero-GC Frame Synchronization Loop
 */

import {
  PerspectiveCamera,
  Scene,
  Vector3,
  Euler,
  WebGLRenderer,
} from 'three';

// ============================================================================
// 1. HybridCameraSynchronizer (2D World Coordinates -> 3D Perspective Frustum)
// ============================================================================

export interface CameraSyncOptions {
  arenaWidth: number;
  arenaHeight: number;
  fov?: number;
  parallaxScaleX?: number; // Parallax coefficient for 3D background shift (default: 0.18)
  parallaxScaleY?: number;
  maxBankRollRad?: number; // Camera roll tilt based on horizontal velocity (default: 0.15)
  baseZ?: number; // Base depth distance of 3D camera
}

export class HybridCameraSynchronizer {
  public camera: PerspectiveCamera;
  public readonly options: Required<CameraSyncOptions>;

  // Reusable vector objects to eliminate GC heap allocation
  private targetPosition = new Vector3();
  private targetRotation = new Euler();

  constructor(options: CameraSyncOptions) {
    const fov = options.fov ?? 50;
    const aspect = options.arenaWidth / Math.max(1, options.arenaHeight);
    this.camera = new PerspectiveCamera(fov, aspect, 0.1, 2000);

    const halfHeight = options.arenaHeight / 2;
    const fovRad = (fov * Math.PI) / 180;
    const computedZ = options.baseZ ?? halfHeight / Math.tan(fovRad / 2);

    this.options = {
      arenaWidth: options.arenaWidth,
      arenaHeight: options.arenaHeight,
      fov,
      parallaxScaleX: options.parallaxScaleX ?? 0.18,
      parallaxScaleY: options.parallaxScaleY ?? 0.18,
      maxBankRollRad: options.maxBankRollRad ?? 0.15,
      baseZ: computedZ,
    };

    this.camera.position.set(0, 0, this.options.baseZ);
  }

  /**
   * Synchronizes 3D background camera from 2D player state:
   * - Translates 2D center offset to 3D parallax displacement
   * - Applies subtle flight banking roll and pitch tilt based on velocity
   */
  public sync(
    playerX: number,
    playerY: number,
    playerVx: number = 0,
    playerVy: number = 0
  ): void {
    const { arenaWidth, arenaHeight, parallaxScaleX, parallaxScaleY, maxBankRollRad, baseZ } =
      this.options;

    // Center-normalized 2D displacement [-0.5..0.5]
    const normOffsetX = (playerX - arenaWidth / 2) / arenaWidth;
    const normOffsetY = (playerY - arenaHeight / 2) / arenaHeight;

    // 3D camera translates in opposite parallax direction
    const camX = normOffsetX * arenaWidth * parallaxScaleX;
    const camY = -normOffsetY * arenaHeight * parallaxScaleY; // Inverted Y in 3D

    this.targetPosition.set(camX, camY, baseZ);
    this.camera.position.copy(this.targetPosition);

    // Dynamic Banking Roll: horizontal speed tilts the horizon
    const roll = Math.max(
      -maxBankRollRad,
      Math.min(maxBankRollRad, (-playerVx / 450) * maxBankRollRad)
    );
    // Pitch tilt: vertical speed pitches the camera slightly
    const pitch = Math.max(-0.1, Math.min(0.1, (-playerVy / 450) * 0.1));

    this.targetRotation.set(pitch, 0, roll, 'YXZ');
    this.camera.rotation.copy(this.targetRotation);
  }
}

// ============================================================================
// 2. HybridLayerCompositor (Manages Dual-View Contexts)
// ============================================================================

export class HybridLayerCompositor {
  public scene3D: Scene;
  public cameraSync: HybridCameraSynchronizer;
  public renderer3D: WebGLRenderer | null = null;

  constructor(cameraSyncOptions: CameraSyncOptions) {
    this.scene3D = new Scene();
    this.cameraSync = new HybridCameraSynchronizer(cameraSyncOptions);
  }

  public attachRenderer(renderer: WebGLRenderer): void {
    this.renderer3D = renderer;
    renderer.setPixelRatio(typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1);
  }

  public render3DBackground(): void {
    if (this.renderer3D) {
      this.renderer3D.render(this.scene3D, this.cameraSync.camera);
    }
  }

  public dispose(): void {
    if (this.renderer3D) {
      this.renderer3D.dispose();
      this.renderer3D = null;
    }
  }
}
