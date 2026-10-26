export type Direction = 'up' | 'down' | 'left' | 'right';

export type NounType = 'baba' | 'flag' | 'wall' | 'rock' | 'water' | 'skull';
export type PropertyType = 'you' | 'win' | 'stop' | 'push' | 'sink' | 'defeat';

export type EntityType =
  | NounType
  | `text_${NounType}`
  | 'text_is'
  | `text_${PropertyType}`;

export interface GridEntity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
}

export interface Rule {
  subject: NounType;
  predicate: PropertyType | NounType;
}

export interface LevelDefinition {
  id: number;
  name: string;
  width: number;
  height: number;
  entities: Omit<GridEntity, 'id'>[];
}

export interface BabaGameSnapshot {
  entities: GridEntity[];
  moveCount: number;
  levelId: number;
  isWon: boolean;
  activeRules: Rule[];
}

export const NOUN_TYPES: NounType[] = ['baba', 'flag', 'wall', 'rock', 'water', 'skull'];
export const PROPERTY_TYPES: PropertyType[] = ['you', 'win', 'stop', 'push', 'sink', 'defeat'];

export function isTextEntity(type: EntityType): boolean {
  return type.startsWith('text_');
}

export function getTextNoun(type: EntityType): NounType | null {
  if (type.startsWith('text_') && type !== 'text_is') {
    const val = type.replace('text_', '') as NounType;
    if (NOUN_TYPES.includes(val)) return val;
  }
  return null;
}

export function getTextProperty(type: EntityType): PropertyType | null {
  if (type.startsWith('text_')) {
    const val = type.replace('text_', '') as PropertyType;
    if (PROPERTY_TYPES.includes(val)) return val;
  }
  return null;
}

export const BABA_LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: '규칙의 탄생 (First Words)',
    width: 9,
    height: 7,
    entities: [
      // Rules on top/left
      { type: 'text_baba', x: 1, y: 1 },
      { type: 'text_is', x: 2, y: 1 },
      { type: 'text_you', x: 3, y: 1 },

      { type: 'text_flag', x: 5, y: 1 },
      { type: 'text_is', x: 6, y: 1 },
      { type: 'text_win', x: 7, y: 1 },

      { type: 'text_wall', x: 1, y: 2 },
      { type: 'text_is', x: 2, y: 2 },
      { type: 'text_stop', x: 3, y: 2 },

      { type: 'text_rock', x: 5, y: 2 },
      { type: 'text_is', x: 6, y: 2 },
      { type: 'text_push', x: 7, y: 2 },

      // World objects
      { type: 'baba', x: 2, y: 4 },
      { type: 'rock', x: 4, y: 4 },
      { type: 'flag', x: 7, y: 4 },

      // Boundary wall line
      { type: 'wall', x: 5, y: 3 },
      { type: 'wall', x: 5, y: 4 },
      { type: 'wall', x: 5, y: 5 },
    ],
  },
  {
    id: 2,
    name: '벽을 넘는 법 (Break the Stop)',
    width: 9,
    height: 7,
    entities: [
      { type: 'text_baba', x: 1, y: 1 },
      { type: 'text_is', x: 2, y: 1 },
      { type: 'text_you', x: 3, y: 1 },

      { type: 'text_flag', x: 5, y: 1 },
      { type: 'text_is', x: 6, y: 1 },
      { type: 'text_win', x: 7, y: 1 },

      // WALL IS STOP rule placed openly so player can push it apart!
      { type: 'text_wall', x: 1, y: 3 },
      { type: 'text_is', x: 2, y: 3 },
      { type: 'text_stop', x: 3, y: 3 },

      { type: 'baba', x: 2, y: 5 },
      // Solid wall dividing the room completely
      { type: 'wall', x: 5, y: 2 },
      { type: 'wall', x: 5, y: 3 },
      { type: 'wall', x: 5, y: 4 },
      { type: 'wall', x: 5, y: 5 },

      { type: 'flag', x: 7, y: 4 },
    ],
  },
  {
    id: 3,
    name: '강 건너 바위 (Sink & Push)',
    width: 9,
    height: 7,
    entities: [
      { type: 'text_baba', x: 1, y: 1 },
      { type: 'text_is', x: 2, y: 1 },
      { type: 'text_you', x: 3, y: 1 },

      { type: 'text_flag', x: 5, y: 1 },
      { type: 'text_is', x: 6, y: 1 },
      { type: 'text_win', x: 7, y: 1 },

      { type: 'text_water', x: 1, y: 2 },
      { type: 'text_is', x: 2, y: 2 },
      { type: 'text_sink', x: 3, y: 2 },

      { type: 'text_rock', x: 5, y: 2 },
      { type: 'text_is', x: 6, y: 2 },
      { type: 'text_push', x: 7, y: 2 },

      { type: 'baba', x: 1, y: 4 },
      { type: 'rock', x: 3, y: 4 },

      // Water stream separating rooms
      { type: 'water', x: 4, y: 2 },
      { type: 'water', x: 4, y: 3 },
      { type: 'water', x: 4, y: 4 },
      { type: 'water', x: 4, y: 5 },

      { type: 'flag', x: 7, y: 4 },
    ],
  },
  {
    id: 4,
    name: '내가 벽이 된다 (Wall Is You)',
    width: 9,
    height: 7,
    entities: [
      { type: 'text_baba', x: 1, y: 1 },
      { type: 'text_is', x: 2, y: 1 },
      { type: 'text_you', x: 3, y: 1 },

      { type: 'text_flag', x: 5, y: 1 },
      { type: 'text_is', x: 6, y: 1 },
      { type: 'text_win', x: 7, y: 1 },

      { type: 'text_wall', x: 2, y: 3 },

      { type: 'baba', x: 2, y: 4 },
      // Isolated walls surround the flag!
      { type: 'wall', x: 6, y: 3 },
      { type: 'wall', x: 6, y: 4 },
      { type: 'wall', x: 6, y: 5 },
      { type: 'flag', x: 7, y: 4 },
    ],
  },
  {
    id: 5,
    name: '해골의 역전 (Skull Is Win)',
    width: 9,
    height: 7,
    entities: [
      { type: 'text_baba', x: 1, y: 1 },
      { type: 'text_is', x: 2, y: 1 },
      { type: 'text_you', x: 3, y: 1 },

      { type: 'text_skull', x: 5, y: 1 },
      { type: 'text_is', x: 6, y: 1 },
      { type: 'text_defeat', x: 7, y: 1 },

      { type: 'text_win', x: 3, y: 3 },

      { type: 'baba', x: 2, y: 5 },
      { type: 'skull', x: 6, y: 5 },
    ],
  },
];

export class BabaRuleShifterEngine {
  private width: number;
  private height: number;
  private entities: GridEntity[] = [];
  private activeRules: Rule[] = [];
  private undoStack: BabaGameSnapshot[] = [];
  private moveCount: number = 0;
  private levelId: number = 1;
  private isWon: boolean = false;
  private nextId: number = 1;

  constructor(levelId: number = 1) {
    this.width = 9;
    this.height = 7;
    this.loadLevel(levelId);
  }

  public loadLevel(levelId: number): void {
    const lvl = BABA_LEVELS.find((l) => l.id === levelId) ?? BABA_LEVELS[0];
    this.levelId = lvl.id;
    this.width = lvl.width;
    this.height = lvl.height;
    this.moveCount = 0;
    this.isWon = false;
    this.undoStack = [];
    this.nextId = 1;

    this.entities = lvl.entities.map((e) => ({
      ...e,
      id: `ent_${this.nextId++}`,
    }));

    this.compileRules();
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public getEntities(): Readonly<GridEntity[]> {
    return this.entities;
  }

  public getActiveRules(): Readonly<Rule[]> {
    return this.activeRules;
  }

  public getMoveCount(): number {
    return this.moveCount;
  }

  public getLevelId(): number {
    return this.levelId;
  }

  public getIsWon(): boolean {
    return this.isWon;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  private saveSnapshot(): void {
    this.undoStack.push({
      entities: this.entities.map((e) => ({ ...e })),
      moveCount: this.moveCount,
      levelId: this.levelId,
      isWon: this.isWon,
      activeRules: this.activeRules.map((r) => ({ ...r })),
    });
    // Limit stack size
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  public undo(): boolean {
    const snap = this.undoStack.pop();
    if (!snap) return false;

    this.entities = snap.entities.map((e) => ({ ...e }));
    this.moveCount = snap.moveCount;
    this.levelId = snap.levelId;
    this.isWon = snap.isWon;
    this.activeRules = snap.activeRules.map((r) => ({ ...r }));
    return true;
  }

  /**
   * Compiles rules from contiguous 3-word horizontal/vertical texts: [Noun] [IS] [Property/Noun]
   */
  public compileRules(): void {
    const rules: Rule[] = [];
    const grid: Map<string, GridEntity[]> = new Map();

    for (const e of this.entities) {
      const key = `${e.x}:${e.y}`;
      let list = grid.get(key);
      if (!list) {
        list = [];
        grid.set(key, list);
      }
      list.push(e);
    }

    const checkTriplet = (e1?: GridEntity, e2?: GridEntity, e3?: GridEntity) => {
      if (!e1 || !e2 || !e3) return;
      if (e2.type !== 'text_is') return;

      const noun = getTextNoun(e1.type);
      if (!noun) return;

      const prop = getTextProperty(e3.type);
      const targetNoun = getTextNoun(e3.type);

      if (prop) {
        rules.push({ subject: noun, predicate: prop });
      } else if (targetNoun) {
        rules.push({ subject: noun, predicate: targetNoun });
      }
    };

    // Horizontal & Vertical scan
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const atCurrent = grid.get(`${x}:${y}`)?.filter((e) => isTextEntity(e.type)) ?? [];
        for (const e1 of atCurrent) {
          // Horizontal: (x, y), (x+1, y), (x+2, y)
          const midH = grid.get(`${x + 1}:${y}`)?.filter((e) => isTextEntity(e.type)) ?? [];
          const endH = grid.get(`${x + 2}:${y}`)?.filter((e) => isTextEntity(e.type)) ?? [];
          for (const e2 of midH) {
            for (const e3 of endH) {
              checkTriplet(e1, e2, e3);
            }
          }

          // Vertical: (x, y), (x, y+1), (x, y+2)
          const midV = grid.get(`${x}:${y + 1}`)?.filter((e) => isTextEntity(e.type)) ?? [];
          const endV = grid.get(`${x}:${y + 2}`)?.filter((e) => isTextEntity(e.type)) ?? [];
          for (const e2 of midV) {
            for (const e3 of endV) {
              checkTriplet(e1, e2, e3);
            }
          }
        }
      }
    }

    this.activeRules = rules;

    // Apply noun-to-noun transformations (e.g. ROCK IS BABA)
    for (const rule of rules) {
      if (NOUN_TYPES.includes(rule.predicate as NounType) && rule.subject !== rule.predicate) {
        const fromNoun = rule.subject;
        const toNoun = rule.predicate as NounType;
        for (const e of this.entities) {
          if (e.type === fromNoun) {
            e.type = toNoun;
          }
        }
      }
    }
  }

  public hasProperty(type: EntityType, prop: PropertyType): boolean {
    // All text blocks have PUSH by default in Baba Is You
    if (isTextEntity(type) && prop === 'push') {
      return true;
    }

    for (const rule of this.activeRules) {
      if (rule.subject === type && rule.predicate === prop) {
        return true;
      }
    }
    return false;
  }

  /**
   * Main movement logic with recursive pushing, stopping, sinking, and victory checks
   */
  public move(dir: Direction): boolean {
    if (this.isWon) return false;

    let dx = 0;
    let dy = 0;
    if (dir === 'up') dy = -1;
    if (dir === 'down') dy = 1;
    if (dir === 'left') dx = -1;
    if (dir === 'right') dx = 1;

    // Find all 'YOU' entities
    const youEntities = this.entities.filter((e) => this.hasProperty(e.type, 'you'));
    if (youEntities.length === 0) return false;

    this.saveSnapshot();

    let anyMoved = false;

    for (const player of youEntities) {
      if (this.tryPush(player, dx, dy)) {
        anyMoved = true;
      }
    }

    if (!anyMoved) {
      // Discard snapshot if nothing changed
      this.undoStack.pop();
      return false;
    }

    this.moveCount++;

    // Re-compile rules as text blocks may have moved!
    this.compileRules();

    // Resolve environmental collisions: SINK, DEFEAT, WIN
    this.resolveInteractions();

    return true;
  }

  private tryPush(entity: GridEntity, dx: number, dy: number): boolean {
    const targetX = entity.x + dx;
    const targetY = entity.y + dy;

    // Grid boundary check
    if (targetX < 0 || targetX >= this.width || targetY < 0 || targetY >= this.height) {
      return false;
    }

    const targetEntities = this.entities.filter((e) => e.x === targetX && e.y === targetY);

    // If any entity has STOP, movement is blocked
    if (targetEntities.some((e) => this.hasProperty(e.type, 'stop'))) {
      return false;
    }

    // Check pushable entities
    const pushables = targetEntities.filter((e) => this.hasProperty(e.type, 'push'));
    for (const pushable of pushables) {
      if (!this.tryPush(pushable, dx, dy)) {
        return false;
      }
    }

    // Move this entity
    entity.x = targetX;
    entity.y = targetY;
    return true;
  }

  private resolveInteractions(): void {
    const toRemove = new Set<string>();

    for (let i = 0; i < this.entities.length; i++) {
      const a = this.entities[i];
      if (toRemove.has(a.id)) continue;

      for (let j = i + 1; j < this.entities.length; j++) {
        const b = this.entities[j];
        if (toRemove.has(b.id)) continue;

        if (a.x === b.x && a.y === b.y) {
          // 1. SINK: Both entities drown/disappear
          const aSink = this.hasProperty(a.type, 'sink');
          const bSink = this.hasProperty(b.type, 'sink');
          if ((aSink && !bSink) || (bSink && !aSink)) {
            toRemove.add(a.id);
            toRemove.add(b.id);
            continue;
          }

          // 2. DEFEAT: 'YOU' touching 'DEFEAT' gets destroyed
          const aYou = this.hasProperty(a.type, 'you');
          const bYou = this.hasProperty(b.type, 'you');
          const aDefeat = this.hasProperty(a.type, 'defeat');
          const bDefeat = this.hasProperty(b.type, 'defeat');

          if (aYou && bDefeat) toRemove.add(a.id);
          if (bYou && aDefeat) toRemove.add(b.id);

          // 3. WIN: 'YOU' touching 'WIN' wins the level!
          const aWin = this.hasProperty(a.type, 'win');
          const bWin = this.hasProperty(b.type, 'win');

          if ((aYou && bWin) || (bYou && aWin)) {
            this.isWon = true;
          }
        }
      }
    }

    if (toRemove.size > 0) {
      this.entities = this.entities.filter((e) => !toRemove.has(e.id));
      this.compileRules();
    }
  }

  public nextLevel(): boolean {
    const nextId = this.levelId + 1;
    const exists = BABA_LEVELS.some((l) => l.id === nextId);
    if (exists) {
      this.loadLevel(nextId);
      return true;
    }
    return false;
  }
}
