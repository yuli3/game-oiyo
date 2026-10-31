/**
 * @file procedural-generation-engine.ts
 * @description 절차적 맵 & 던전 생성 엔진
 * - Wave Function Collapse (WFC) 2D 타일 기반 절차적 지형 생성
 * - Binary Space Partitioning (BSP) 던전 방/복도 생성
 * - 결정론적 고속 Xorshift PRNG (Seedable Random)
 */

/**
 * 시드 기반 결정론적 32비트 Xorshift 의사 난수 생성기
 */
export class DeterministicPRNG {
  private state: number;

  constructor(seed = 1337) {
    this.state = seed === 0 ? 1337 : seed >>> 0;
  }

  public next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (this.state >>> 0) / 4294967296;
  }

  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max + 1));
  }

  public pick<T>(array: readonly T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }
}

/**
 * 2D Wave Function Collapse (WFC) 타일 모델
 */
export interface WfcTileRule {
  id: number;
  name: string;
  weight: number;
  // 각 방향 소켓 식별자 [상(북), 우(동), 하(남), 좌(서)]
  sockets: [string, string, string, string];
}

export interface WfcGridResult {
  width: number;
  height: number;
  tiles: number[]; // 1D 인덱스 (y * width + x)
  success: boolean;
}

export class WaveFunctionCollapse2D {
  private readonly width: number;
  private readonly height: number;
  private readonly tiles: WfcTileRule[];
  private readonly prng: DeterministicPRNG;

  constructor(
    width: number,
    height: number,
    tiles: WfcTileRule[],
    seed = 42
  ) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
    this.prng = new DeterministicPRNG(seed);
  }

  public generate(maxAttempts = 10): WfcGridResult {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = this.runSinglePass();
      if (result.success) return result;
    }

    // 실패 시 기본 타일로 채운 결과 반환
    return {
      width: this.width,
      height: this.height,
      tiles: new Array(this.width * this.height).fill(this.tiles[0].id),
      success: false,
    };
  }

  private runSinglePass(): WfcGridResult {
    const totalCells = this.width * this.height;
    // 각 셀마다 가능한 타일 ID 세트
    const possibilities: Set<number>[] = Array.from(
      { length: totalCells },
      () => new Set(this.tiles.map((t) => t.id))
    );

    const tileMap = new Map<number, WfcTileRule>(this.tiles.map((t) => [t.id, t]));

    while (true) {
      // 1. 최소 엔트로피(남은 가능성이 2개 이상이면서 가장 적은) 셀 탐색
      let minEntropy = Infinity;
      let targetIndex = -1;

      for (let i = 0; i < totalCells; i++) {
        const count = possibilities[i].size;
        if (count > 1 && count < minEntropy) {
          minEntropy = count;
          targetIndex = i;
        }
      }

      // 모든 셀이 확정(entropy = 1)되었으면 성공
      if (targetIndex === -1) {
        return {
          width: this.width,
          height: this.height,
          tiles: possibilities.map((set) => Array.from(set)[0] ?? this.tiles[0].id),
          success: true,
        };
      }

      // 2. 타겟 셀을 하나의 타일로 붕괴(Collapse)
      const currentPossibles = Array.from(possibilities[targetIndex]);
      if (currentPossibles.length === 0) {
        // 모순(Contradiction) 발생
        return { width: this.width, height: this.height, tiles: [], success: false };
      }

      // 가중치 기반 선택
      const chosenTileId = this.pickWeighted(currentPossibles, tileMap);
      possibilities[targetIndex] = new Set([chosenTileId]);

      // 3. 인접 셀로 제약 전파 (Propagation)
      const stack = [targetIndex];
      let contradiction = false;

      while (stack.length > 0) {
        const curr = stack.pop()!;
        const cx = curr % this.width;
        const cy = Math.floor(curr / this.width);

        // 4방향 확인: [0: 북, 1: 동, 2: 남, 3: 서]
        const neighbors = [
          { x: cx, y: cy - 1, dir: 0, opp: 2 }, // 북 (맞은편 남)
          { x: cx + 1, y: cy, dir: 1, opp: 3 }, // 동 (맞은편 서)
          { x: cx, y: cy + 1, dir: 2, opp: 0 }, // 남 (맞은편 북)
          { x: cx - 1, y: cy, dir: 3, opp: 1 }, // 서 (맞은편 동)
        ];

        for (const n of neighbors) {
          if (n.x < 0 || n.x >= this.width || n.y < 0 || n.y >= this.height) continue;
          const nIdx = n.y * this.width + n.x;
          const nSet = possibilities[nIdx];
          if (nSet.size <= 1) continue;

          // 현재 셀에서 가능한 타일들의 해당 방향 소켓들 수집
          const validSockets = new Set<string>();
          for (const currTileId of possibilities[curr]) {
            const rule = tileMap.get(currTileId);
            if (rule) validSockets.add(rule.sockets[n.dir]);
          }

          // 이웃 셀의 가능성 필터링 (반대편 소켓이 매칭되어야 함)
          let changed = false;
          for (const candidateTileId of Array.from(nSet)) {
            const candidateRule = tileMap.get(candidateTileId);
            if (!candidateRule || !validSockets.has(candidateRule.sockets[n.opp])) {
              nSet.delete(candidateTileId);
              changed = true;
            }
          }

          if (nSet.size === 0) {
            contradiction = true;
            break;
          }

          if (changed) {
            stack.push(nIdx);
          }
        }

        if (contradiction) break;
      }

      if (contradiction) {
        return { width: this.width, height: this.height, tiles: [], success: false };
      }
    }
  }

  private pickWeighted(
    tileIds: number[],
    tileMap: Map<number, WfcTileRule>
  ): number {
    let totalWeight = 0;
    for (const id of tileIds) {
      totalWeight += tileMap.get(id)?.weight ?? 1;
    }

    let roll = this.prng.next() * totalWeight;
    for (const id of tileIds) {
      const w = tileMap.get(id)?.weight ?? 1;
      if (roll <= w) return id;
      roll -= w;
    }
    return tileIds[0];
  }
}

/**
 * Binary Space Partitioning (BSP) 던전 생성기
 */
export interface BspRoom {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BspCorridor {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BspDungeonResult {
  width: number;
  height: number;
  grid: number[][]; // 0: 벽, 1: 방 바닥, 2: 복도
  rooms: BspRoom[];
  corridors: BspCorridor[];
}

class BspNode {
  public left: BspNode | null = null;
  public right: BspNode | null = null;
  public room: BspRoom | null = null;

  constructor(
    public x: number,
    public y: number,
    public w: number,
    public h: number
  ) {}

  public split(minSize: number, prng: DeterministicPRNG): boolean {
    if (this.left || this.right) return false;

    // 분할 방향 결정 (가로 또는 세로)
    let splitH = prng.next() > 0.5;
    if (this.w > this.h && this.w / this.h >= 1.25) splitH = false;
    else if (this.h > this.w && this.h / this.w >= 1.25) splitH = true;

    const max = (splitH ? this.h : this.w) - minSize;
    if (max <= minSize) return false;

    const splitPos = prng.nextInt(minSize, max);

    if (splitH) {
      this.left = new BspNode(this.x, this.y, this.w, splitPos);
      this.right = new BspNode(this.x, this.y + splitPos, this.w, this.h - splitPos);
    } else {
      this.left = new BspNode(this.x, this.y, splitPos, this.h);
      this.right = new BspNode(this.x + splitPos, this.y, this.w - splitPos, this.h);
    }

    return true;
  }
}

export class BinarySpacePartitionDungeon {
  private readonly width: number;
  private readonly height: number;
  private readonly minSize: number;
  private readonly prng: DeterministicPRNG;

  constructor(
    width: number,
    height: number,
    minSize = 6,
    seed = 777
  ) {
    this.width = width;
    this.height = height;
    this.minSize = minSize;
    this.prng = new DeterministicPRNG(seed);
  }

  public generate(): BspDungeonResult {
    const grid: number[][] = Array.from({ length: this.height }, () =>
      new Array(this.width).fill(0)
    );

    const root = new BspNode(0, 0, this.width, this.height);
    const nodes: BspNode[] = [root];

    // 1. 재귀적 노드 분할
    let didSplit = true;
    while (didSplit) {
      didSplit = false;
      for (const node of [...nodes]) {
        if (!node.left && !node.right) {
          if (
            (node.w > this.minSize * 2 || node.h > this.minSize * 2) &&
            node.split(this.minSize, this.prng)
          ) {
            nodes.push(node.left!);
            nodes.push(node.right!);
            didSplit = true;
          }
        }
      }
    }

    // 2. 리프 노드에 방 생성
    const rooms: BspRoom[] = [];
    for (const node of nodes) {
      if (!node.left && !node.right) {
        const roomW = this.prng.nextInt(
          Math.max(3, Math.floor(node.w * 0.6)),
          node.w - 2
        );
        const roomH = this.prng.nextInt(
          Math.max(3, Math.floor(node.h * 0.6)),
          node.h - 2
        );
        const roomX = node.x + this.prng.nextInt(1, node.w - roomW - 1);
        const roomY = node.y + this.prng.nextInt(1, node.h - roomH - 1);

        node.room = { x: roomX, y: roomY, w: roomW, h: roomH };
        rooms.push(node.room);

        // 방 바닥(1) 칠하기
        for (let ry = roomY; ry < roomY + roomH; ry++) {
          for (let rx = roomX; rx < roomX + roomW; rx++) {
            if (rx >= 0 && rx < this.width && ry >= 0 && ry < this.height) {
              grid[ry][rx] = 1;
            }
          }
        }
      }
    }

    // 3. 복도 연결 (트리 상향식 통로 뚫기)
    const corridors: BspCorridor[] = [];
    this.createCorridors(root, corridors, grid);

    return {
      width: this.width,
      height: this.height,
      grid,
      rooms,
      corridors,
    };
  }

  private createCorridors(
    node: BspNode,
    corridors: BspCorridor[],
    grid: number[][]
  ): BspRoom | null {
    if (!node.left && !node.right) {
      return node.room;
    }

    const leftRoom = node.left ? this.createCorridors(node.left, corridors, grid) : null;
    const rightRoom = node.right ? this.createCorridors(node.right, corridors, grid) : null;

    if (leftRoom && rightRoom) {
      const x1 = Math.floor(leftRoom.x + leftRoom.w / 2);
      const y1 = Math.floor(leftRoom.y + leftRoom.h / 2);
      const x2 = Math.floor(rightRoom.x + rightRoom.w / 2);
      const y2 = Math.floor(rightRoom.y + rightRoom.h / 2);

      corridors.push({ x1, y1, x2, y2 });

      // L자형 복도 뚫기
      let cx = x1;
      let cy = y1;

      while (cx !== x2) {
        if (grid[cy] && grid[cy][cx] === 0) grid[cy][cx] = 2; // 복도(2)
        cx += cx < x2 ? 1 : -1;
      }
      while (cy !== y2) {
        if (grid[cy] && grid[cy][cx] === 0) grid[cy][cx] = 2;
        cy += cy < y2 ? 1 : -1;
      }

      return leftRoom;
    }

    return leftRoom ?? rightRoom;
  }
}
