export type LaneType = 'grass' | 'road' | 'rail' | 'river';

export interface Vehicle {
  x: number;
  width: number;
  speed: number;
  type: 'car' | 'truck' | 'sport';
  color: string;
}

export interface FloatingLog {
  x: number;
  width: number;
  speed: number;
}

export interface Lane {
  index: number;
  type: LaneType;
  trees?: number[]; // X coordinates of static tree obstacles on grass
  vehicles?: Vehicle[];
  logs?: FloatingLog[];
  direction?: 1 | -1;
  baseSpeed?: number;
  trainActive?: boolean;
  trainX?: number;
  trainSpeed?: number;
  trainWarningTimer?: number; // countdown until train rushes through
}

export interface CrossyRoadState {
  playerX: number; // grid column (e.g. 0 to 10)
  playerLane: number; // grid lane (0 is start, increases forward)
  isHopping: boolean;
  hopProgress: number; // 0 to 1
  hopStartX: number;
  hopStartLane: number;
  hopTargetX: number;
  hopTargetLane: number;
  score: number;
  maxScore: number;
  coins: number;
  isAlive: boolean;
  deathReason: 'car' | 'train' | 'drown' | 'eagle' | null;
  idleTimer: number; // seconds standing still
  eagleActive: boolean;
  eagleY: number; // swoop animation
  lanes: Lane[];
}

export class CrossyRoadEngine {
  public state: CrossyRoadState;
  public gridWidth = 11; // -5 to +5 around center 0
  private nextLaneIndex = 0;

  constructor() {
    this.state = this.initGame();
  }

  public initGame(): CrossyRoadState {
    this.nextLaneIndex = 0;
    const lanes: Lane[] = [];

    // Spawn 5 safe starting grass lanes
    for (let i = 0; i < 5; i++) {
      lanes.push(this.generateLane('grass'));
    }

    // Spawn initial set of 25 procedural lanes
    for (let i = 0; i < 25; i++) {
      lanes.push(this.generateRandomLane());
    }

    return {
      playerX: 0,
      playerLane: 2,
      isHopping: false,
      hopProgress: 1,
      hopStartX: 0,
      hopStartLane: 2,
      hopTargetX: 0,
      hopTargetLane: 2,
      score: 0,
      maxScore: 0,
      coins: 0,
      isAlive: true,
      deathReason: null,
      idleTimer: 0,
      eagleActive: false,
      eagleY: -10,
      lanes,
    };
  }

  public generateRandomLane(): Lane {
    const laneTypes: LaneType[] = ['road', 'road', 'river', 'river', 'rail', 'grass'];
    const chosenType = laneTypes[Math.floor(Math.random() * laneTypes.length)];
    return this.generateLane(chosenType);
  }

  public generateLane(type: LaneType): Lane {
    const idx = this.nextLaneIndex++;
    const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const baseSpeed = (1.5 + Math.random() * 2.5) * dir;

    const lane: Lane = {
      index: idx,
      type,
      direction: dir,
      baseSpeed,
    };

    if (type === 'grass') {
      const trees: number[] = [];
      // Don't put trees on the middle 3 tiles in the first few lanes
      for (let x = -5; x <= 5; x++) {
        if (idx < 5 && Math.abs(x) <= 1) continue;
        if (Math.random() < 0.22) {
          trees.push(x);
        }
      }
      lane.trees = trees;
    } else if (type === 'road') {
      const vehicles: Vehicle[] = [];
      const numVehicles = 2 + Math.floor(Math.random() * 2);
      const colors = ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#a855f7'];

      for (let i = 0; i < numVehicles; i++) {
        const isTruck = Math.random() > 0.6;
        vehicles.push({
          x: -12 + (24 / numVehicles) * i + (Math.random() * 2 - 1),
          width: isTruck ? 2.8 : 1.6,
          speed: baseSpeed,
          type: isTruck ? 'truck' : 'car',
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      lane.vehicles = vehicles;
    } else if (type === 'river') {
      const logs: FloatingLog[] = [];
      const numLogs = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numLogs; i++) {
        logs.push({
          x: -12 + (24 / numLogs) * i + (Math.random() * 2 - 1),
          width: 2.2 + Math.random() * 1.5,
          speed: baseSpeed * 0.75,
        });
      }
      lane.logs = logs;
    } else if (type === 'rail') {
      lane.trainActive = false;
      lane.trainX = -30 * dir;
      lane.trainSpeed = 16 * dir;
      lane.trainWarningTimer = 3.0 + Math.random() * 4.0;
    }

    return lane;
  }

  public hop(dx: number, dy: number): boolean {
    if (!this.state.isAlive || this.state.isHopping) return false;

    const targetX = Math.max(-5, Math.min(5, this.state.playerX + dx));
    const targetLane = Math.max(0, this.state.playerLane + dy);

    // Obstacle tree collision on grass
    const targetLaneData = this.state.lanes.find((l) => l.index === targetLane);
    if (targetLaneData && targetLaneData.type === 'grass' && targetLaneData.trees?.includes(targetX)) {
      return false; // Can't hop into a tree!
    }

    this.state.isHopping = true;
    this.state.hopProgress = 0;
    this.state.hopStartX = this.state.playerX;
    this.state.hopStartLane = this.state.playerLane;
    this.state.hopTargetX = targetX;
    this.state.hopTargetLane = targetLane;
    this.state.idleTimer = 0; // Reset idle eagle timer

    if (targetLane > this.state.maxScore) {
      this.state.maxScore = targetLane;
      this.state.score = targetLane - 2; // subtract 2 for starter lane offset
    }

    // Dynamically stream more lanes if player moves forward
    while (this.state.lanes.length < this.state.playerLane + 25) {
      this.state.lanes.push(this.generateRandomLane());
    }

    return true;
  }

  public update(dt: number): void {
    if (!this.state.isAlive) {
      if (this.state.eagleActive) {
        this.state.eagleY += dt * 14;
      }
      return;
    }

    // 1. Update Hop Animation
    if (this.state.isHopping) {
      this.state.hopProgress = Math.min(1.0, this.state.hopProgress + dt * 8.0);
      this.state.playerX =
        this.state.hopStartX +
        (this.state.hopTargetX - this.state.hopStartX) * this.state.hopProgress;
      this.state.playerLane =
        this.state.hopStartLane +
        (this.state.hopTargetLane - this.state.hopStartLane) * this.state.hopProgress;

      if (this.state.hopProgress >= 1.0) {
        this.state.isHopping = false;
        this.state.playerX = this.state.hopTargetX;
        this.state.playerLane = this.state.hopTargetLane;
      }
    } else {
      // 2. Idle Timer (Eagle Swoop if paused > 3.5s)
      this.state.idleTimer += dt;
      if (this.state.idleTimer >= 3.8) {
        this.killPlayer('eagle');
        return;
      }
    }

    // 3. Update Vehicles, Trains & River Logs
    for (const lane of this.state.lanes) {
      if (lane.vehicles) {
        for (const v of lane.vehicles) {
          v.x += v.speed * dt;
          // Wrap around screen boundaries
          if (v.speed > 0 && v.x > 14) v.x = -14;
          else if (v.speed < 0 && v.x < -14) v.x = 14;
        }
      }

      if (lane.logs) {
        for (const log of lane.logs) {
          log.x += log.speed * dt;
          if (log.speed > 0 && log.x > 14) log.x = -14;
          else if (log.speed < 0 && log.x < -14) log.x = 14;
        }
      }

      if (lane.type === 'rail') {
        if (!lane.trainActive) {
          lane.trainWarningTimer = (lane.trainWarningTimer || 3.0) - dt;
          if (lane.trainWarningTimer <= 0) {
            lane.trainActive = true;
            lane.trainX = (lane.direction === 1 ? -25 : 25);
          }
        } else {
          lane.trainX = (lane.trainX || 0) + (lane.trainSpeed || 15) * dt;
          if (
            (lane.trainSpeed! > 0 && lane.trainX! > 30) ||
            (lane.trainSpeed! < 0 && lane.trainX! < -30)
          ) {
            lane.trainActive = false;
            lane.trainWarningTimer = 4.0 + Math.random() * 5.0;
          }
        }
      }
    }

    // 4. River Log Drift & Water Collision
    const currentLane = this.state.lanes.find(
      (l) => l.index === Math.round(this.state.playerLane)
    );

    if (currentLane && currentLane.type === 'river') {
      let onLog = false;
      let logSpeed = 0;

      if (currentLane.logs) {
        for (const log of currentLane.logs) {
          const halfW = log.width / 2;
          if (this.state.playerX >= log.x - halfW && this.state.playerX <= log.x + halfW) {
            onLog = true;
            logSpeed = log.speed;
            break;
          }
        }
      }

      if (onLog) {
        // Player drifts with the log!
        this.state.playerX += logSpeed * dt;
        // Drown if drifted off screen bounds
        if (this.state.playerX < -5.5 || this.state.playerX > 5.5) {
          this.killPlayer('drown');
          return;
        }
      } else if (!this.state.isHopping) {
        // Landed in water without log -> splash and drown!
        this.killPlayer('drown');
        return;
      }
    }

    // 5. Vehicle Collision Check on Road
    if (currentLane && currentLane.type === 'road' && currentLane.vehicles) {
      for (const v of currentLane.vehicles) {
        const halfW = v.width / 2;
        if (
          Math.abs(this.state.playerLane - currentLane.index) < 0.45 &&
          this.state.playerX >= v.x - halfW - 0.25 &&
          this.state.playerX <= v.x + halfW + 0.25
        ) {
          this.killPlayer('car');
          return;
        }
      }
    }

    // 6. Train Collision Check on Rail
    if (
      currentLane &&
      currentLane.type === 'rail' &&
      currentLane.trainActive &&
      currentLane.trainX !== undefined
    ) {
      if (
        Math.abs(this.state.playerLane - currentLane.index) < 0.5 &&
        Math.abs(this.state.playerX - currentLane.trainX) < 4.5
      ) {
        this.killPlayer('train');
        return;
      }
    }
  }

  public killPlayer(reason: 'car' | 'train' | 'drown' | 'eagle'): void {
    this.state.isAlive = false;
    this.state.deathReason = reason;
    if (reason === 'eagle') {
      this.state.eagleActive = true;
      this.state.eagleY = -8;
    }
  }
}
