/**
 * Pure simulation engine for 『미니 메트로 웹 (Mini Metro Web)』
 *
 * Procedural minimalist transit line simulation:
 * Station spawning, passenger routing, multi-line trains, and crowding dynamics.
 */

export type StationShape = "circle" | "triangle" | "square" | "star";

export interface MetroStation {
  id: string;
  x: number;
  y: number;
  shape: StationShape;
  passengers: StationShape[];
  overcrowdedTimer: number; // seconds (0 to 15)
}

export interface MetroTrain {
  id: string;
  lineId: string;
  currentStationIndex: number;
  progress: number; // 0 to 1 towards next station
  direction: 1 | -1;
  capacity: number;
  passengers: StationShape[];
}

export interface MetroLine {
  id: string;
  name: string;
  color: string;
  stationIds: string[];
  trains: MetroTrain[];
}

export type MiniMetroStatus = "running" | "paused" | "gameover";

export interface MiniMetroGame {
  stations: MetroStation[];
  lines: MetroLine[];
  day: number;
  simTime: number; // total simulated seconds
  passengersDelivered: number;
  availableLinesCount: number;
  status: MiniMetroStatus;
  gameoverStationId?: string;
  nextPassengerSpawn: number;
  nextStationSpawn: number;
}

export const STATION_CROWD_LIMIT = 6;
export const OVERCROWD_MAX_SECONDS = 15;
export const TRAIN_SPEED = 0.35; // station segments per second

export const DEFAULT_LINE_COLORS = [
  "#ef4444", // Red Line
  "#3b82f6", // Blue Line
  "#10b981", // Green Line
  "#f59e0b", // Yellow Line
];

/**
 * Creates an initial Mini Metro network with 3 starter stations
 */
export function createInitialMiniMetroGame(): MiniMetroGame {
  const stations: MetroStation[] = [
    { id: "st-1", x: 160, y: 150, shape: "circle", passengers: [], overcrowdedTimer: 0 },
    { id: "st-2", x: 300, y: 240, shape: "triangle", passengers: [], overcrowdedTimer: 0 },
    { id: "st-3", x: 440, y: 130, shape: "square", passengers: [], overcrowdedTimer: 0 },
  ];

  const lines: MetroLine[] = [
    {
      id: "line-red",
      name: "1호선 (Red)",
      color: DEFAULT_LINE_COLORS[0],
      stationIds: ["st-1", "st-2"],
      trains: [
        {
          id: "train-red-1",
          lineId: "line-red",
          currentStationIndex: 0,
          progress: 0.1,
          direction: 1,
          capacity: 6,
          passengers: [],
        },
      ],
    },
    {
      id: "line-blue",
      name: "2호선 (Blue)",
      color: DEFAULT_LINE_COLORS[1],
      stationIds: [],
      trains: [
        {
          id: "train-blue-1",
          lineId: "line-blue",
          currentStationIndex: 0,
          progress: 0,
          direction: 1,
          capacity: 6,
          passengers: [],
        },
      ],
    },
    {
      id: "line-green",
      name: "3호선 (Green)",
      color: DEFAULT_LINE_COLORS[2],
      stationIds: [],
      trains: [
        {
          id: "train-green-1",
          lineId: "line-green",
          currentStationIndex: 0,
          progress: 0,
          direction: 1,
          capacity: 6,
          passengers: [],
        },
      ],
    },
  ];

  return {
    stations,
    lines,
    day: 1,
    simTime: 0,
    passengersDelivered: 0,
    availableLinesCount: 3,
    status: "running",
    nextPassengerSpawn: 2,
    nextStationSpawn: 18,
  };
}

/**
 * Connect a station to an existing line
 */
export function connectStationToLine(
  game: MiniMetroGame,
  lineId: string,
  stationId: string
): MiniMetroGame {
  const line = game.lines.find((l) => l.id === lineId);
  if (!line || line.stationIds.includes(stationId)) {
    return game;
  }

  const updatedLines = game.lines.map((l) => {
    if (l.id !== lineId) return l;
    return {
      ...l,
      stationIds: [...l.stationIds, stationId],
    };
  });

  return {
    ...game,
    lines: updatedLines,
  };
}

/**
 * Clear all stations from a line
 */
export function clearLine(game: MiniMetroGame, lineId: string): MiniMetroGame {
  return {
    ...game,
    lines: game.lines.map((l) =>
      l.id === lineId ? { ...l, stationIds: [], trains: l.trains.map((t) => ({ ...t, progress: 0, passengers: [] })) } : l
    ),
  };
}

export interface MetroStepEvent {
  deliveredCount: number;
  overcrowdedStationIds: string[];
  newStationSpawned?: MetroStation;
}

/**
 * Advance deterministic simulation step by dt seconds
 */
export function stepMiniMetro(
  game: MiniMetroGame,
  dt: number
): { game: MiniMetroGame; events: MetroStepEvent } {
  const events: MetroStepEvent = {
    deliveredCount: 0,
    overcrowdedStationIds: [],
  };

  if (game.status !== "running") {
    return { game, events };
  }

  const simTime = game.simTime + dt;
  const day = Math.floor(simTime / 60) + 1; // 60s per week/day
  let passengersDelivered = game.passengersDelivered;
  let status: MiniMetroStatus = "running";
  let gameoverStationId = game.gameoverStationId;

  // 1. Check passenger spawning
  let nextPassengerSpawn = game.nextPassengerSpawn - dt;
  const stations = game.stations.map((s) => ({ ...s, passengers: [...s.passengers] }));

  if (nextPassengerSpawn <= 0) {
    nextPassengerSpawn = Math.max(1.5, 4.0 - stations.length * 0.15);
    // Random station picks a passenger wanting another shape
    const randomStationIdx = Math.floor(Math.random() * stations.length);
    const originStation = stations[randomStationIdx];

    // Pick shape distinct from origin station shape
    const availableShapes: StationShape[] = ["circle", "triangle", "square"];
    if (stations.some((s) => s.shape === "star")) availableShapes.push("star");
    const otherShapes = availableShapes.filter((sh) => sh !== originStation.shape);
    const destinationShape = otherShapes[Math.floor(Math.random() * otherShapes.length)] ?? "square";

    if (originStation.passengers.length < 12) {
      originStation.passengers.push(destinationShape);
    }
  }

  // 2. Check procedural station spawning
  let nextStationSpawn = game.nextStationSpawn - dt;
  if (nextStationSpawn <= 0 && stations.length < 10) {
    nextStationSpawn = 24;
    const newId = `st-${stations.length + 1}`;
    const shapes: StationShape[] = ["circle", "triangle", "square", "star"];
    const shape = shapes[stations.length % shapes.length];
    const newStation: MetroStation = {
      id: newId,
      x: 100 + Math.floor(Math.random() * 400),
      y: 80 + Math.floor(Math.random() * 240),
      shape,
      passengers: [],
      overcrowdedTimer: 0,
    };
    stations.push(newStation);
    events.newStationSpawned = newStation;
  }

  // 3. Move trains and board/disembark passengers
  const lines = game.lines.map((line) => {
    if (line.stationIds.length < 2) return line;

    const trains = line.trains.map((train) => {
      let progress = train.progress + TRAIN_SPEED * dt;
      let currentStationIndex = train.currentStationIndex;
      let direction = train.direction;
      let passengers = [...train.passengers];

      if (progress >= 1.0) {
        // Train arrived at next station
        progress = 0;
        currentStationIndex += direction;

        // Check bounce at line ends
        if (currentStationIndex >= line.stationIds.length - 1) {
          currentStationIndex = line.stationIds.length - 1;
          direction = -1;
        } else if (currentStationIndex <= 0) {
          currentStationIndex = 0;
          direction = 1;
        }

        const arrivedStationId = line.stationIds[currentStationIndex];
        const station = stations.find((s) => s.id === arrivedStationId);

        if (station) {
          // A. Disembark passengers matching this station's shape
          const remainingTrainPassengers: StationShape[] = [];
          for (const p of passengers) {
            if (p === station.shape) {
              passengersDelivered += 1;
              events.deliveredCount += 1;
            } else {
              remainingTrainPassengers.push(p);
            }
          }
          passengers = remainingTrainPassengers;

          // B. Board waiting passengers who need a shape served on this line
          const lineStationShapes = new Set(
            line.stationIds.map((id) => stations.find((s) => s.id === id)?.shape)
          );

          const remainingStationPassengers: StationShape[] = [];
          for (const p of station.passengers) {
            if (passengers.length < train.capacity && lineStationShapes.has(p)) {
              passengers.push(p);
            } else {
              remainingStationPassengers.push(p);
            }
          }
          station.passengers = remainingStationPassengers;
        }
      }

      return {
        ...train,
        currentStationIndex,
        progress,
        direction,
        passengers,
      };
    });

    return {
      ...line,
      trains,
    };
  });

  // 4. Overcrowding check on stations
  for (const station of stations) {
    if (station.passengers.length >= STATION_CROWD_LIMIT) {
      station.overcrowdedTimer += dt;
      events.overcrowdedStationIds.push(station.id);

      if (station.overcrowdedTimer >= OVERCROWD_MAX_SECONDS) {
        status = "gameover";
        gameoverStationId = station.id;
      }
    } else {
      station.overcrowdedTimer = Math.max(0, station.overcrowdedTimer - dt * 1.5);
    }
  }

  return {
    game: {
      ...game,
      stations,
      lines,
      day,
      simTime,
      passengersDelivered,
      status,
      gameoverStationId,
      nextPassengerSpawn,
      nextStationSpawn,
    },
    events,
  };
}
