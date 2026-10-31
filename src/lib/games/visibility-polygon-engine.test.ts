import { describe, it, expect } from "vitest";
import { VisibilityPolygon2D, type Segment2D } from "./visibility-polygon-engine";

describe("2D Dynamic Visibility Polygon Engine", () => {
  it("calculates 360-degree visibility polygon occluded by an obstacle wall", () => {
    // 중앙 광원: (0, 0)
    // 장애물 벽: x=50, y=-20 ~ y=20 (우측을 가로막는 수직 벽)
    const wall: Segment2D = {
      p1: { x: 50, y: -20 },
      p2: { x: 50, y: 20 },
    };

    const polygon = VisibilityPolygon2D.compute(0, 0, [wall], 200);

    expect(polygon.length).toBeGreaterThan(10);

    // 벽을 향해 방사된 레이는 x=50 부근에서 가로막혀야 함
    const hitWallPoints = polygon.filter(
      (pt) => Math.abs(pt.x - 50) < 1.0 && pt.y >= -21 && pt.y <= 21
    );
    expect(hitWallPoints.length).toBeGreaterThanOrEqual(2);

    // 반대편(-x)으로 방사된 레이는 최대 반경 200 부근까지 도달해야 함
    const leftPoints = polygon.filter((pt) => pt.x < -150);
    expect(leftPoints.length).toBeGreaterThan(0);
  });

  it("clips visibility into a forward directional FOV cone", () => {
    // 광원 (0, 0), 전방 0 rad (오른쪽 +x 방향), 시야각 PI/2 (90도)
    const polygon = VisibilityPolygon2D.compute(
      0,
      0,
      [],
      100,
      Math.PI / 2, // 90도 원뿔
      0 // 전방 (+x 방향)
    );

    // 첫 정점은 광원 시작점 (0, 0)이어야 함
    expect(polygon[0].x).toBe(0);
    expect(polygon[0].y).toBe(0);

    // FOV 원뿔 내부의 모든 점은 x >= 0 이어야 함
    for (const pt of polygon) {
      expect(pt.x).toBeGreaterThanOrEqual(-0.01);
    }
  });
});
