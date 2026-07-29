import React, { Suspense, useEffect, useState } from 'react';
import { hasWebGL } from '../../../lib/games/webgl';

interface Lazy3DStageProps {
  /** True once the player has actually started — gates the 900KB scene import. */
  active: boolean;
  /** The lazily-imported scene. Create it with `lazy(() => import('./XScene'))`. */
  children: React.ReactNode;
  /** Shown while the scene chunk downloads, and as the pre-start view. */
  placeholder: React.ReactNode;
  /** Shown instead of the scene when the device has no WebGL. */
  fallback: React.ReactNode;
  className?: string;
}

/**
 * Shell for a 3D game: keeps the heavy scene out of the page until it is needed
 * and guarantees a non-WebGL path exists.
 *
 * The measured reason this matters: SpatialMemory's shell chunk is 12KB while
 * its scene chunk is 898KB. Importing the scene eagerly would put ~900KB on
 * every visitor of every game page in the catalog, including devices that
 * cannot render it at all.
 *
 * WebGL is probed after mount rather than during render because the probe
 * touches `document`, and this component is server-rendered as part of the page
 * shell (which is also what gives the crawler something to read).
 */
export const Lazy3DStage: React.FC<Lazy3DStageProps> = ({
  active, children, placeholder, fallback, className = '',
}) => {
  // Assume capable until proven otherwise: flipping true→false after mount only
  // swaps a placeholder, whereas false→true would flash the fallback at
  // everyone on the first paint.
  const [webgl, setWebgl] = useState(true);
  useEffect(() => { setWebgl(hasWebGL()); }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {active && webgl && <Suspense fallback={placeholder}>{children}</Suspense>}
      {active && !webgl && fallback}
      {!active && placeholder}
    </div>
  );
};
