/**
/**
 * 배드 노스 미니 (Bad North Tactics) 코어 게임 엔진
 *
 * Bad North 스타일의 미니멀 실시간 섬 방어 전술 시뮬레이션.
 * - 아이소메트릭 3D 고립 섬 디오라마 (절벽, 고지대, 모래사장 상륙지, 방어 가옥)
 * - 3대 병과 상성:
 *   1. 보병 (Infantry): 밀치기(Knockback) 검사, 적을 절벽/바다로 낙하시킴
 *   2. 궁병 (Archers): 고지대 곡사 사격, 비방패 적에게 치명적
 *   3. 창병 (Pikes): 방진 정지(Braced) 시 돌격 적 즉사 차단, 이동 중 공격 불가
 * - 바이킹 침략선: 모래사장 접안 후 도끼병, 방패병, 버서커 상륙
 * - 가옥 방어: 방화 저지 및 생존 가옥 수 비례 골드 보상
 */

export type SquadType = "infantry" | "archers" | "pikes";
export type RaiderType = "militia" | "shield" | "berserker";

export interface Position2D {
  x: number;
  y: number;
}

export interface IslandTile {
  x: number;
  y: number;
  height: number; // 0: 바다, 1: 모래사장, 2: 1단 평원, 3: 2단 절벽 고지대
  hasHouse?: boolean;
  houseId?: string;
}

export interface House {
  id: string;
  x: number;
  y: number;
  hp: number; // 최대 100
  coins: number;
  isBurning: boolean;
  destroyed: boolean;
}

export interface UnitSquad {
  id: string;
  type: SquadType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  count: number; // 최대 9명
  maxCount: number;
  hpPerUnit: number; // 100
  isBraced: boolean; // 창병 방진 여부
  level: number;
  kills: number;
  facing: "N" | "S" | "E" | "W";
}

export interface RaiderShip {
  id: string;
  type: RaiderType;
  x: number;
  y: number;
  targetBeach: Position2D;
  units: number; // 6~12명
  landed: boolean;
  speed: number;
  arrivalDelay: number; // 착륙까지 남은 시간(초)
}

export interface RaiderUnit {
  id: string;
  type: RaiderType;
  x: number;
  y: number;
  hp: number;
  speed: number;
  targetHouseId: string | null;
  targetSquadId: string | null;
  hasShield: boolean;
}

export interface ArrowProjectile {
  id: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 ~ 1.0
  arcHeight: number;
  damage: number;
}

export interface BadNorthState {
  islandWidth: number;
  islandHeight: number;
  tiles: IslandTile[];
  houses: House[];
  squads: UnitSquad[];
  ships: RaiderShip[];
  raiders: RaiderUnit[];
  arrows: ArrowProjectile[];
  gold: number;
  wave: number;
  maxWave: number;
  waveTimer: number;
  gameStatus: "playing" | "victory" | "defeat";
  selectedSquadId: string | null;
  housesSaved: number;
  totalKills: number;
}

export class BadNorthEngine {
  private state: BadNorthState;

  constructor(islandWidth = 10, islandHeight = 10) {
    this.state = this.generateIsland(islandWidth, islandHeight);
  }

  public getState(): BadNorthState {
    return this.state;
  }

  /**
   * 절차적 섬 지형 및 가옥, 초기 분대 생성
   */
  public generateIsland(width: number, height: number): BadNorthState {
    const tiles: IslandTile[] = [];
    const houses: House[] = [];

    // 중앙은 고지대(2~3), 외곽은 모래사장(1) 및 바다(0)
    const midX = width / 2;
    const midY = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distFromCenter = Math.hypot(x - midX, y - midY);
        let h = 0;

        if (distFromCenter < 2.0) {
          h = 3; // 최상층 절벽
        } else if (distFromCenter < 3.8) {
          h = 2; // 중앙 평원
        } else if (distFromCenter < 4.8) {
          h = 1; // 모래사장
        } else {
          h = 0; // 바다
        }

        tiles.push({ x, y, height: h });
      }
    }

    // 가옥 3채 배치 (높이 2 평원 지역)
    const houseCoords = [
      { x: Math.floor(midX - 1), y: Math.floor(midY) },
      { x: Math.floor(midX + 1), y: Math.floor(midY - 1) },
      { x: Math.floor(midX), y: Math.floor(midY + 1) },
    ];

    houseCoords.forEach((coord, idx) => {
      const houseId = `house_${idx + 1}`;
      houses.push({
        id: houseId,
        x: coord.x,
        y: coord.y,
        hp: 100,
        coins: 15,
        isBurning: false,
        destroyed: false,
      });

      const t = tiles.find((tile) => tile.x === coord.x && tile.y === coord.y);
      if (t) {
        t.hasHouse = true;
        t.houseId = houseId;
      }
    });

    // 플레이어 3개 병과 분대 초기 배치 (보병, 궁병, 창병)
    const squads: UnitSquad[] = [
      {
        id: "squad_infantry",
        type: "infantry",
        x: midX - 1,
        y: midY + 1,
        targetX: midX - 1,
        targetY: midY + 1,
        count: 9,
        maxCount: 9,
        hpPerUnit: 100,
        isBraced: false,
        level: 1,
        kills: 0,
        facing: "S",
      },
      {
        id: "squad_archers",
        type: "archers",
        x: midX,
        y: midY,
        targetX: midX,
        targetY: midY,
        count: 9,
        maxCount: 9,
        hpPerUnit: 80,
        isBraced: false,
        level: 1,
        kills: 0,
        facing: "E",
      },
      {
        id: "squad_pikes",
        type: "pikes",
        x: midX + 1,
        y: midY + 1,
        targetX: midX + 1,
        targetY: midY + 1,
        count: 9,
        maxCount: 9,
        hpPerUnit: 120,
        isBraced: true,
        level: 1,
        kills: 0,
        facing: "N",
      },
    ];

    // 첫 웨이브 바이킹 함선 스폰
    const ships = this.generateWaveShips(1, width, height);

    return {
      islandWidth: width,
      islandHeight: height,
      tiles,
      houses,
      squads,
      ships,
      raiders: [],
      arrows: [],
      gold: 0,
      wave: 1,
      maxWave: 3,
      waveTimer: 0,
      gameStatus: "playing",
      selectedSquadId: "squad_infantry",
      housesSaved: 0,
      totalKills: 0,
    };
  }

  /**
   * 웨이브별 바이킹 함선 생성 (바다 외곽에서 접근)
   */
  private generateWaveShips(wave: number, width: number, height: number): RaiderShip[] {
    const ships: RaiderShip[] = [];
    const count = 2 + wave; // 웨이브당 3, 4, 5척

    for (let i = 0; i < count; i++) {
      // 4개 방향(동서남북 바다 외곽)에서 무작위 접근
      const side = i % 4;
      let startX = 0;
      let startY = 0;
      let beachX = Math.floor(width / 2);
      let beachY = Math.floor(height / 2);

      if (side === 0) {
        // 북쪽
        startX = 2 + (i * 2) % (width - 4);
        startY = -2;
        beachX = startX;
        beachY = 1;
      } else if (side === 1) {
        // 남쪽
        startX = 2 + (i * 2) % (width - 4);
        startY = height + 2;
        beachX = startX;
        beachY = height - 2;
      } else if (side === 2) {
        // 서쪽
        startX = -2;
        startY = 2 + (i * 2) % (height - 4);
        beachX = 1;
        beachY = startY;
      } else {
        // 동쪽
        startX = width + 2;
        startY = 2 + (i * 2) % (height - 4);
        beachX = width - 2;
        beachY = startY;
      }

      // 바이킹 유형 (웨이브 1: militia, 2: shield 추가, 3: berserker 추가)
      let type: RaiderType = "militia";
      if (wave >= 2 && i % 2 === 1) type = "shield";
      if (wave >= 3 && i === count - 1) type = "berserker";

      ships.push({
        id: `ship_w${wave}_${i}`,
        type,
        x: startX,
        y: startY,
        targetBeach: { x: beachX, y: beachY },
        units: type === "berserker" ? 4 : 6,
        landed: false,
        speed: 1.2,
        arrivalDelay: 2.0 + i * 3.5, // 순차 착륙
      });
    }

    return ships;
  }

  /**
   * 분대 선택 및 목표 이동 명령
   */
  public selectSquad(squadId: string): void {
    const sq = this.state.squads.find((s) => s.id === squadId);
    if (sq && sq.count > 0) {
      this.state.selectedSquadId = squadId;
    }
  }

  public moveSelectedSquad(targetX: number, targetY: number): boolean {
    if (!this.state.selectedSquadId) return false;
    const squad = this.state.squads.find((s) => s.id === this.state.selectedSquadId);
    if (!squad || squad.count <= 0) return false;

    // 타일 유효성 확인 (바다에는 이동 불가)
    const tile = this.state.tiles.find(
      (t) => Math.round(t.x) === Math.round(targetX) && Math.round(t.y) === Math.round(targetY)
    );
    if (!tile || tile.height === 0) return false;

    squad.targetX = targetX;
    squad.targetY = targetY;
    squad.isBraced = false; // 이동 시 창병 방진 해제

    // 방향 결정
    const dx = targetX - squad.x;
    const dy = targetY - squad.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      squad.facing = dx > 0 ? "E" : "W";
    } else {
      squad.facing = dy > 0 ? "S" : "N";
    }

    return true;
  }

  /**
   * 메인 60fps 업데이트 시뮬레이션
   */
  public update(dt: number): BadNorthState {
    if (this.state.gameStatus !== "playing") {
      return this.state;
    }

    this.state.waveTimer += dt;

    // 1. 플레이어 분대 이동 및 방진
    this.updateSquads(dt);

    // 2. 바이킹 함선 접근 및 상륙
    this.updateShips(dt);

    // 3. 상륙한 침략자 이동 및 가옥 방화/분대 공격
    this.updateRaiders(dt);

    // 4. 전투 해결 (궁병 사격, 창병 돌격 차단, 보병 난전 밀치기)
    this.updateCombat(dt);

    // 5. 화살 발사체 물리 궤적
    this.updateArrows(dt);

    // 6. 가옥 체력 및 파괴 검사
    this.updateHouses(dt);

    // 7. 승리 / 패배 검사 및 다음 웨이브 트리거
    this.checkGameConditions();

    return this.state;
  }

  private updateSquads(dt: number): void {
    const moveSpeed = 2.4;
    for (const squad of this.state.squads) {
      if (squad.count <= 0) continue;

      const dx = squad.targetX - squad.x;
      const dy = squad.targetY - squad.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.05) {
        const step = Math.min(dist, moveSpeed * dt);
        squad.x += (dx / dist) * step;
        squad.y += (dy / dist) * step;
        squad.isBraced = false;
      } else {
        squad.x = squad.targetX;
        squad.y = squad.targetY;
        // 창병은 정지 시 0.5초 후 자동 방진(Brace) 구축
        if (squad.type === "pikes") {
          squad.isBraced = true;
        }
      }
    }
  }

  private updateShips(dt: number): void {
    for (const ship of this.state.ships) {
      if (ship.landed) continue;

      if (ship.arrivalDelay > 0) {
        ship.arrivalDelay -= dt;
        continue;
      }

      // 모래사장을 향해 항해
      const dx = ship.targetBeach.x - ship.x;
      const dy = ship.targetBeach.y - ship.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.3) {
        ship.x += (dx / dist) * ship.speed * dt;
        ship.y += (dy / dist) * ship.speed * dt;
      } else {
        // 상륙! 침략자 유닛 생성
        ship.landed = true;
        this.spawnRaidersFromShip(ship);
      }
    }
  }

  private spawnRaidersFromShip(ship: RaiderShip): void {
    for (let i = 0; i < ship.units; i++) {
      const offsetX = (Math.random() - 0.5) * 0.6;
      const offsetY = (Math.random() - 0.5) * 0.6;

      this.state.raiders.push({
        id: `raider_${ship.id}_${i}`,
        type: ship.type,
        x: ship.targetBeach.x + offsetX,
        y: ship.targetBeach.y + offsetY,
        hp: ship.type === "berserker" ? 180 : 100,
        speed: ship.type === "berserker" ? 2.5 : 1.4,
        targetHouseId: null,
        targetSquadId: null,
        hasShield: ship.type === "shield",
      });
    }
  }

  private updateRaiders(dt: number): void {
    const intactHouses = this.state.houses.filter((h) => !h.destroyed);
    const activeSquads = this.state.squads.filter((s) => s.count > 0);

    for (const r of this.state.raiders) {
      if (r.hp <= 0) continue;

      // 가장 가까운 가옥 또는 분대 탐색
      let targetX = r.x;
      let targetY = r.y;

      if (intactHouses.length > 0) {
        // 가장 가까운 가옥 찾기
        let closestH = intactHouses[0];
        let minDist = Infinity;
        for (const h of intactHouses) {
          const d = Math.hypot(h.x - r.x, h.y - r.y);
          if (d < minDist) {
            minDist = d;
            closestH = h;
          }
        }
        r.targetHouseId = closestH.id;
        targetX = closestH.x;
        targetY = closestH.y;
      } else if (activeSquads.length > 0) {
        // 가옥이 없으면 분대 공격
        const sq = activeSquads[0];
        targetX = sq.x;
        targetY = sq.y;
      }

      // 목표를 향해 전진
      const dx = targetX - r.x;
      const dy = targetY - r.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.4) {
        r.x += (dx / dist) * r.speed * dt;
        r.y += (dy / dist) * r.speed * dt;
      } else {
        // 가옥 방화
        if (r.targetHouseId) {
          const h = this.state.houses.find((item) => item.id === r.targetHouseId);
          if (h && !h.destroyed) {
            h.isBurning = true;
            h.hp -= 18 * dt;
          }
        }
      }
    }
  }

  private updateCombat(dt: number): void {
    // 1. 궁병 원거리 사격
    const archers = this.state.squads.find((s) => s.type === "archers" && s.count > 0);
    if (archers) {
      // 사거리 5.0 내의 침략자 탐색
      const inRangeRaiders = this.state.raiders.filter(
        (r) => r.hp > 0 && Math.hypot(r.x - archers.x, r.y - archers.y) <= 5.0
      );

      if (inRangeRaiders.length > 0 && Math.random() < 0.65 * dt) {
        // 화살 발사
        const target = inRangeRaiders[Math.floor(Math.random() * inRangeRaiders.length)];
        this.state.arrows.push({
          id: `arrow_${Date.now()}_${Math.random()}`,
          startX: archers.x,
          startY: archers.y,
          currentX: archers.x,
          currentY: archers.y,
          targetX: target.x,
          targetY: target.y,
          progress: 0,
          arcHeight: 1.2,
          damage: 55,
        });
      }
    }

    // 2. 근접 교전 (창병 방진 & 보병 칼싸움 밀치기)
    for (const squad of this.state.squads) {
      if (squad.count <= 0) continue;

      for (const raider of this.state.raiders) {
        if (raider.hp <= 0) continue;

        const dist = Math.hypot(raider.x - squad.x, raider.y - squad.y);
        if (dist <= 0.85) {
          if (squad.type === "pikes" && squad.isBraced) {
            // 창병 방진은 정면 돌격 적에게 치명타 및 넉백
            raider.hp -= 160 * dt;
            // 넉백 (물러서게 함)
            const pushX = (raider.x - squad.x) / dist;
            const pushY = (raider.y - squad.y) / dist;
            raider.x += pushX * 1.5 * dt;
            raider.y += pushY * 1.5 * dt;

            if (raider.hp <= 0) {
              squad.kills++;
              this.state.totalKills++;
            }
          } else if (squad.type === "infantry") {
            // 보병은 균형 잡힌 검술 + 적을 절벽/물로 밀쳐냄
            raider.hp -= 70 * dt;
            squad.hpPerUnit -= 15 * dt;

            // 밀치기
            const pushX = (raider.x - squad.x) / dist;
            const pushY = (raider.y - squad.y) / dist;
            raider.x += pushX * 2.2 * dt;
            raider.y += pushY * 2.2 * dt;

            // 바다(높이 0)로 밀려나면 즉사!
            const tile = this.state.tiles.find(
              (t) => Math.round(t.x) === Math.round(raider.x) && Math.round(t.y) === Math.round(raider.y)
            );
            if (!tile || tile.height === 0) {
              raider.hp = 0;
              squad.kills++;
              this.state.totalKills++;
            }

            if (raider.hp <= 0) {
              squad.kills++;
              this.state.totalKills++;
            }

            // 아군 분대 사상자 발생
            if (squad.hpPerUnit <= 0) {
              squad.count--;
              squad.hpPerUnit = 100;
            }
          } else {
            // 궁병은 근접전에서 취약
            squad.hpPerUnit -= 40 * dt;
            if (squad.hpPerUnit <= 0) {
              squad.count--;
              squad.hpPerUnit = 80;
            }
          }
        }
      }
    }

    // 사망한 침략자 필터링
    this.state.raiders = this.state.raiders.filter((r) => r.hp > 0);
  }

  private updateArrows(dt: number): void {
    const flightSpeed = 3.5;
    const remainingArrows: ArrowProjectile[] = [];

    for (const arrow of this.state.arrows) {
      arrow.progress += flightSpeed * dt;

      arrow.currentX = arrow.startX + (arrow.targetX - arrow.startX) * arrow.progress;
      arrow.currentY = arrow.startY + (arrow.targetY - arrow.startY) * arrow.progress;

      if (arrow.progress >= 1.0) {
        // 화살 착탄!
        const hitRaider = this.state.raiders.find(
          (r) => r.hp > 0 && Math.hypot(r.x - arrow.targetX, r.y - arrow.targetY) < 0.6
        );

        if (hitRaider) {
          // 방패 소지 유저는 75% 확률로 화살 방어
          if (hitRaider.hasShield && Math.random() < 0.75) {
            // Deflected!
          } else {
            hitRaider.hp -= arrow.damage;
            if (hitRaider.hp <= 0) {
              this.state.totalKills++;
              const archers = this.state.squads.find((s) => s.type === "archers");
              if (archers) archers.kills++;
            }
          }
        }
      } else {
        remainingArrows.push(arrow);
      }
    }

    this.state.arrows = remainingArrows;
  }

  private updateHouses(dt: number): void {
    for (const h of this.state.houses) {
      if (h.destroyed) continue;

      if (h.hp <= 0) {
        h.destroyed = true;
        h.isBurning = false;
        h.hp = 0;
      }
    }
  }

  private checkGameConditions(): void {
    // 패배: 모든 분대 전멸 또는 모든 가옥 파괴
    const allSquadsDead = this.state.squads.every((s) => s.count <= 0);
    const allHousesDestroyed = this.state.houses.every((h) => h.destroyed);

    if (allSquadsDead || allHousesDestroyed) {
      this.state.gameStatus = "defeat";
      return;
    }

    // 웨이브 클리어 확인: 모든 함선 상륙 완료 및 모든 침략자 전멸
    const allShipsLanded = this.state.ships.every((s) => s.landed);
    const allRaidersDead = this.state.raiders.length === 0;

    if (allShipsLanded && allRaidersDead) {
      if (this.state.wave < this.state.maxWave) {
        // 다음 웨이브 시작
        this.state.wave++;
        this.state.ships = this.generateWaveShips(
          this.state.wave,
          this.state.islandWidth,
          this.state.islandHeight
        );
      } else {
        // 최종 승리! 생존 가옥 보상 골드 정산
        const saved = this.state.houses.filter((h) => !h.destroyed);
        this.state.housesSaved = saved.length;
        this.state.gold += saved.reduce((sum, h) => sum + h.coins, 0);
        this.state.gameStatus = "victory";
      }
    }
  }
}
