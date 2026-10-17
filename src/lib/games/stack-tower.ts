export interface TowerBlock {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  color: string;
}

export interface CutPiece {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  color: string;
}

export interface MovingBlock {
  axis: 'x' | 'z';
  position: number;
  direction: 1 | -1;
  speed: number;
  width: number;
  depth: number;
  color: string;
}

export interface SliceResult {
  success: boolean;
  isPerfect: boolean;
  placedBlock?: TowerBlock;
  cutPiece?: CutPiece;
}

export const PERFECT_TOLERANCE = 0.2;
export const BLOCK_HEIGHT = 0.8;
export const INITIAL_SIZE = 4.0;
export const MOVE_RANGE = 5.0;

export function getBlockColor(index: number): string {
  const hue = (index * 14) % 360;
  return `hsl(${hue}, 80%, 60%)`;
}

export function sliceBlock(
  moving: MovingBlock,
  top: TowerBlock,
  index: number
): SliceResult {
  const isX = moving.axis === 'x';
  const pos = moving.position;
  const topPos = isX ? top.x : top.z;
  const size = isX ? moving.width : moving.depth;
  const otherSize = isX ? moving.depth : moving.width;
  const diff = pos - topPos;

  // Perfect placement check
  if (Math.abs(diff) <= PERFECT_TOLERANCE) {
    const placed: TowerBlock = {
      x: isX ? top.x : moving.position,
      y: (index + 1) * BLOCK_HEIGHT,
      z: isX ? moving.position : top.z,
      width: top.width,
      depth: top.depth,
      color: moving.color,
    };
    return {
      success: true,
      isPerfect: true,
      placedBlock: placed,
    };
  }

  const currentMin = pos - size / 2;
  const currentMax = pos + size / 2;
  const topMin = topPos - size / 2;
  const topMax = topPos + size / 2;

  const overlapMin = Math.max(currentMin, topMin);
  const overlapMax = Math.min(currentMax, topMax);
  const overlap = overlapMax - overlapMin;

  if (overlap <= 0) {
    return { success: false, isPerfect: false };
  }

  const newPos = (overlapMin + overlapMax) / 2;
  const cutSize = size - overlap;
  const cutPos = diff > 0
    ? overlapMax + cutSize / 2
    : overlapMin - cutSize / 2;

  const placedBlock: TowerBlock = {
    x: isX ? newPos : top.x,
    y: (index + 1) * BLOCK_HEIGHT,
    z: isX ? top.z : newPos,
    width: isX ? overlap : otherSize,
    depth: isX ? otherSize : overlap,
    color: moving.color,
  };

  const cutPiece: CutPiece = {
    x: isX ? cutPos : top.x,
    y: (index + 1) * BLOCK_HEIGHT,
    z: isX ? top.z : cutPos,
    width: isX ? cutSize : otherSize,
    depth: isX ? otherSize : cutSize,
    color: moving.color,
  };

  return {
    success: true,
    isPerfect: false,
    placedBlock,
    cutPiece,
  };
}

export function updateMovingBlock(
  block: MovingBlock,
  delta: number
): MovingBlock {
  let nextPos = block.position + block.direction * block.speed * delta;
  let nextDir = block.direction;

  if (nextPos > MOVE_RANGE) {
    nextPos = MOVE_RANGE;
    nextDir = -1;
  } else if (nextPos < -MOVE_RANGE) {
    nextPos = -MOVE_RANGE;
    nextDir = 1;
  }

  return {
    ...block,
    position: nextPos,
    direction: nextDir,
  };
}

export function createInitialMovingBlock(top: TowerBlock, index: number): MovingBlock {
  const axis: 'x' | 'z' = index % 2 === 0 ? 'x' : 'z';
  return {
    axis,
    position: -MOVE_RANGE,
    direction: 1,
    speed: Math.min(4.5 + index * 0.1, 9.0),
    width: top.width,
    depth: top.depth,
    color: getBlockColor(index + 1),
  };
}
