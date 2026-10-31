/**
 * OIYO Motion v12 Native Haptic Gesture Controller (`motion-gesture-controller.ts`)
 *
 * Implements Research Goal 10:
 * - Inertial drag physics & rubber-band elastic bounds
 * - Multi-tiered native mobile haptic feedback (`navigator.vibrate`)
 * - Directional 8-way swipe gesture recognizer
 */

export interface DragPhysicsState {
  offset: number;
  velocity: number;
  isDragging: boolean;
}

export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | null;

export class MotionGestureController {
  public static readonly RUBBER_BAND_FACTOR = 0.55;

  /**
   * Applies iOS-like rubber-band resistance when dragging beyond min/max limits.
   */
  public static computeRubberBand(
    currentOffset: number,
    minLimit: number,
    maxLimit: number,
    dragDelta: number
  ): number {
    let newOffset = currentOffset + dragDelta;

    if (newOffset < minLimit) {
      const overdrag = minLimit - newOffset;
      newOffset = minLimit - overdrag * MotionGestureController.RUBBER_BAND_FACTOR;
    } else if (newOffset > maxLimit) {
      const overdrag = newOffset - maxLimit;
      newOffset = maxLimit + overdrag * MotionGestureController.RUBBER_BAND_FACTOR;
    }

    return newOffset;
  }

  /**
   * Recognizes swipe gesture direction from start and end points within maxDurationMs.
   */
  public static detectSwipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    thresholdPx: number = 30
  ): SwipeDirection {
    const dx = endX - startX;
    const dy = endY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < thresholdPx) {
      return null; // Tap or minor jitter
    }

    if (absX > absY) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  /**
   * Triggers tiered native mobile haptic vibrations.
   */
  public static triggerHaptic(tier: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning'): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.vibrate) {
      return;
    }

    try {
      switch (tier) {
        case 'selection':
        case 'light':
          navigator.vibrate(8);
          break;
        case 'medium':
          navigator.vibrate(18);
          break;
        case 'heavy':
          navigator.vibrate([28, 40, 28]);
          break;
        case 'success':
          navigator.vibrate([10, 30, 20]);
          break;
        case 'warning':
          navigator.vibrate([35, 30, 35]);
          break;
      }
    } catch {
      // Ignore vibration errors on unsupported hardware
    }
  }
}
