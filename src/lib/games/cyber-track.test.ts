import { describe, it, expect } from "vitest";
import {
  OFFICIAL_TRACKS,
  createInitialCarState,
  stepCarPhysics,
  sampleGhostFrame,
  formatLapTime,
  type CarInput,
  type GhostFrame,
} from "./cyber-track";

describe("CyberTrack 3D Physics & Engine", () => {
  it("defines official tracks with valid checkpoints and a finish line", () => {
    expect(OFFICIAL_TRACKS.length).toBeGreaterThanOrEqual(3);
    for (const track of OFFICIAL_TRACKS) {
      expect(track.checkpoints.length).toBeGreaterThan(0);
      const finish = track.checkpoints.find((cp) => cp.isFinish);
      expect(finish).toBeDefined();
    }
  });

  it("creates initial car state in ready status at start position", () => {
    const track = OFFICIAL_TRACKS[0];
    const car = createInitialCarState(track);
    expect(car.status).toBe("ready");
    expect(car.speed).toBe(0);
    expect(car.x).toBe(track.startPos.x);
    expect(car.z).toBe(track.startPos.z);
    expect(car.currentCheckpointIdx).toBe(0);
    expect(car.lapTimeMs).toBe(0);
  });

  it("accelerates forward when throttle is positive and transitions to racing", () => {
    const track = OFFICIAL_TRACKS[0];
    let car = createInitialCarState(track);
    const input: CarInput = { throttle: 1, steer: 0, drift: false, boost: false };

    const { nextCar } = stepCarPhysics(car, input, 0.5, track);
    expect(nextCar.status).toBe("racing");
    expect(nextCar.speed).toBeGreaterThan(0);
    expect(nextCar.lapTimeMs).toBeGreaterThan(0);
  });

  it("brakes when speed is positive and throttle is negative", () => {
    const track = OFFICIAL_TRACKS[0];
    let car = createInitialCarState(track);
    car.speed = 100;
    car.status = "racing";

    const brakeInput: CarInput = { throttle: -1, steer: 0, drift: false, boost: false };
    const { nextCar } = stepCarPhysics(car, brakeInput, 0.2, track);
    expect(nextCar.speed).toBeLessThan(100);
  });

  it("steers left and right when moving", () => {
    const track = OFFICIAL_TRACKS[0];
    let car = createInitialCarState(track);
    car.speed = 80;
    car.status = "racing";

    const steerRight: CarInput = { throttle: 1, steer: 1, drift: false, boost: false };
    const { nextCar } = stepCarPhysics(car, steerRight, 0.2, track);
    expect(nextCar.angle).toBeGreaterThan(car.angle);
  });

  it("accumulates drift score during high-speed drifting", () => {
    const track = OFFICIAL_TRACKS[0];
    let car = createInitialCarState(track);
    car.speed = 80;
    car.status = "racing";

    const driftInput: CarInput = { throttle: 1, steer: 0.8, drift: true, boost: false };
    const { nextCar } = stepCarPhysics(car, driftInput, 0.3, track);
    expect(nextCar.isDrifting).toBe(true);
    expect(nextCar.driftScore).toBeGreaterThan(0);
  });

  it("detects checkpoint pass and finishes race on final checkpoint", () => {
    const track = OFFICIAL_TRACKS[0];
    let car = createInitialCarState(track);
    car.status = "racing";

    // Place car directly inside checkpoint 1
    const cp1 = track.checkpoints[0];
    car.x = cp1.x;
    car.z = cp1.z;

    const { nextCar, checkpointPassed } = stepCarPhysics(
      car,
      { throttle: 0.5, steer: 0, drift: false, boost: false },
      0.016,
      track
    );

    expect(checkpointPassed?.id).toBe(cp1.id);
    expect(nextCar.currentCheckpointIdx).toBe(1);

    // Place car at finish checkpoint
    const finishCp = track.checkpoints[track.checkpoints.length - 1];
    nextCar.currentCheckpointIdx = track.checkpoints.length - 1;
    nextCar.x = finishCp.x;
    nextCar.z = finishCp.z;

    const resFinish = stepCarPhysics(
      nextCar,
      { throttle: 0.5, steer: 0, drift: false, boost: false },
      0.016,
      track
    );

    expect(resFinish.isLapFinished).toBe(true);
    expect(resFinish.nextCar.status).toBe("finished");
  });

  it("samples and interpolates ghost replay frames", () => {
    const frames: GhostFrame[] = [
      { timeMs: 0, x: 0, y: 0, z: 0, angle: 0 },
      { timeMs: 1000, x: 10, y: 0, z: 20, angle: 1.0 },
    ];

    const exact = sampleGhostFrame(frames, 0);
    expect(exact?.x).toBe(0);

    const mid = sampleGhostFrame(frames, 500);
    expect(mid?.x).toBe(5);
    expect(mid?.z).toBe(10);
    expect(mid?.angle).toBe(0.5);

    const past = sampleGhostFrame(frames, 2000);
    expect(past?.x).toBe(10);
  });

  it("formats lap time into readable mm:ss.hh string", () => {
    expect(formatLapTime(0)).toBe("00:00.00");
    expect(formatLapTime(65430)).toBe("01:05.43");
    expect(formatLapTime(123456)).toBe("02:03.45");
  });
});
