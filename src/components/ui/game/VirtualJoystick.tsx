/**
 * @file VirtualJoystick.tsx
 * @description Pillar 1: Platform Mobile Universal Virtual Controller v2.
 * Provides floating/fixed 360-degree analog joystick and 8-way directional d-pad
 * with pointer isolation, haptic pulse on threshold, and 100dvh safe-area support.
 */

import React, { useCallback, useRef, useState } from "react";
import { createHaptics } from "../../../lib/games/haptics";
import { MobileHapticsPro } from "../../../lib/games/engine-suite-unified";

export interface JoystickVector {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
  knobDistance: number;
}

export interface VirtualJoystickProps {
  mode?: "analog" | "digital-8";
  floating?: boolean;
  maxRadius?: number;
  deadzone?: number;
  onMove: (vector: JoystickVector) => void;
  onRelease?: () => void;
  className?: string;
}

export function calculateJoystickVector(params: {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  maxRadius: number;
  deadzone?: number;
}): JoystickVector {
  const { startX, startY, currentX, currentY, maxRadius, deadzone = 0.1 } = params;
  const dx = currentX - startX;
  const dy = currentY - startY;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return { x: 0, y: 0, magnitude: 0, angle: 0, knobDistance: 0 };
  }

  const rawMagnitude = distance / maxRadius;
  const clampedMagnitude = Math.min(1.0, rawMagnitude);
  const angle = Math.atan2(dy, dx);
  const knobDistance = Math.min(distance, maxRadius);

  if (clampedMagnitude < deadzone) {
    return { x: 0, y: 0, magnitude: 0, angle, knobDistance };
  }

  const normalized = (clampedMagnitude - deadzone) / (1.0 - deadzone);
  return {
    x: Math.cos(angle) * normalized,
    y: Math.sin(angle) * normalized,
    magnitude: normalized,
    angle,
    knobDistance,
  };
}

export function snapVectorTo8Ways(vector: JoystickVector): JoystickVector {
  if (vector.magnitude <= 0.1) {
    return { x: 0, y: 0, magnitude: 0, angle: 0, knobDistance: 0 };
  }

  // Snap to 8 directions (multiples of 45 deg / PI / 4)
  const step = Math.PI / 4;
  const snappedAngle = Math.round(vector.angle / step) * step;

  return {
    ...vector,
    x: Math.cos(snappedAngle),
    y: Math.sin(snappedAngle),
    angle: snappedAngle,
  };
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  mode = "analog",
  floating = true,
  maxRadius = 60,
  deadzone = 0.1,
  onMove,
  onRelease,
  className = "",
}) => {
  const [active, setActive] = useState(false);
  const [basePos, setBasePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const hapticsRef = useRef(createHaptics());
  const thresholdPassed = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== null) return;
      activePointerId.current = e.pointerId;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      setBasePos({ x: clientX, y: clientY });
      setKnobPos({ x: 0, y: 0 });
      setActive(true);
      thresholdPassed.current = false;
      hapticsRef.current.fire("tap");
      MobileHapticsPro.lightImpact();
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== e.pointerId || !active) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const rawVec = calculateJoystickVector({
        startX: basePos.x,
        startY: basePos.y,
        currentX,
        currentY,
        maxRadius,
        deadzone,
      });

      const finalVec = mode === "digital-8" ? snapVectorTo8Ways(rawVec) : rawVec;

      setKnobPos({
        x: Math.cos(rawVec.angle) * rawVec.knobDistance,
        y: Math.sin(rawVec.angle) * rawVec.knobDistance,
      });

      if (finalVec.magnitude > 0.8 && !thresholdPassed.current) {
        thresholdPassed.current = true;
        hapticsRef.current.fire("place");
        MobileHapticsPro.mediumImpact();
      } else if (finalVec.magnitude < 0.6) {
        thresholdPassed.current = false;
      }

      onMove(finalVec);
    },
    [active, basePos, maxRadius, deadzone, mode, onMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== e.pointerId) return;
      activePointerId.current = null;
      setActive(false);
      setKnobPos({ x: 0, y: 0 });
      thresholdPassed.current = false;
      MobileHapticsPro.selectionClick();

      onMove({ x: 0, y: 0, magnitude: 0, angle: 0, knobDistance: 0 });
      onRelease?.();
    },
    [onMove, onRelease]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative select-none touch-none ${className}`}
    >
      {active && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/40 bg-card/60 backdrop-blur-xs shadow-lg animate-in zoom-in-75 duration-100 left-(--base-x) top-(--base-y) size-(--base-size)"
          style={
            {
              "--base-x": `${basePos.x}px`,
              "--base-y": `${basePos.y}px`,
              "--base-size": `${maxRadius * 2}px`,
            } as React.CSSProperties
          }
        >
          {/* Knob */}
          <div
            className="absolute rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-md transition-transform duration-75 size-11 -translate-x-1/2 -translate-y-1/2 translate-x-(--knob-x) translate-y-(--knob-y)"
            style={
              {
                "--knob-x": `${knobPos.x}px`,
                "--knob-y": `${knobPos.y}px`,
              } as React.CSSProperties
            }
          />
        </div>
      )}
    </div>
  );
};
