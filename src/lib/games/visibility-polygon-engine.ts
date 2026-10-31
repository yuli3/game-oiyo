/**
 * @file visibility-polygon-engine.ts
 * @description 2D 다이내믹 가시성 시야각 & 폴리곤 그림자 엔진
 * - 선분(Segment) 엔드포인트 각도 레이캐스팅 기반 가시성 폴리곤 (Visibility Polygon)
 * - 전방 지향형 원뿔 시야각 (Field of View Cone) 클리핑
 * - 소프트 조명 및 안개 마스크 렌더 헬퍼
 */

export interface Segment2D {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}

export interface RayIntersection {
  x: number;
  y: number;
  param: number; // 광선 상의 거리 비율 (0.0 ~ 1.0)
  angle: number; // 방사 각도
}

export class VisibilityPolygon2D {
  /**
   * 광원 위치에서 장애물 세그먼트들을 가로막는 가시성 폴리곤 정점들 계산
   */
  public static compute(
    sourceX: number,
    sourceY: number,
    segments: Segment2D[],
    maxRadius = 500,
    fovAngleRad?: number,
    headingRad?: number
  ): { x: number; y: number }[] {
    // 맵 경계 박스를 세그먼트에 추가 (대각선 길이 고려 1.5배)
    const span = maxRadius * 1.5;
    const bounds: Segment2D[] = [
      { p1: { x: sourceX - span, y: sourceY - span }, p2: { x: sourceX + span, y: sourceY - span } },
      { p1: { x: sourceX + span, y: sourceY - span }, p2: { x: sourceX + span, y: sourceY + span } },
      { p1: { x: sourceX + span, y: sourceY + span }, p2: { x: sourceX - span, y: sourceY + span } },
      { p1: { x: sourceX - span, y: sourceY + span }, p2: { x: sourceX - span, y: sourceY - span } },
    ];

    const allSegments = [...segments, ...bounds];

    // 모든 엔드포인트의 각도 수집 + 360도 균일 샘플링 각도 추가
    const rawAngles: number[] = [];
    for (let i = 0; i < 32; i++) {
      rawAngles.push(-Math.PI + (i / 32) * Math.PI * 2);
    }

    for (const seg of allSegments) {
      for (const pt of [seg.p1, seg.p2]) {
        const angle = Math.atan2(pt.y - sourceY, pt.x - sourceX);
        rawAngles.push(angle);
        rawAngles.push(angle - 0.0001);
        rawAngles.push(angle + 0.0001);
      }
    }

    // FOV 원뿔 제약이 있는 경우 경계 각도 추가 및 필터링
    let candidateAngles = rawAngles;
    if (fovAngleRad !== undefined && headingRad !== undefined) {
      const halfFov = fovAngleRad / 2;
      const minAngle = headingRad - halfFov;
      const maxAngle = headingRad + halfFov;

      candidateAngles = rawAngles.filter((a) => {
        let diff = (a - headingRad) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        return Math.abs(diff) <= halfFov;
      });

      candidateAngles.push(minAngle, maxAngle);
    }

    // 고유 각도 추출 및 정렬
    candidateAngles.sort((a, b) => a - b);

    const intersections: RayIntersection[] = [];

    for (const angle of candidateAngles) {
      const rayLength = maxRadius * 2.0;
      const dx = Math.cos(angle) * rayLength;
      const dy = Math.sin(angle) * rayLength;

      const ray = {
        p1: { x: sourceX, y: sourceY },
        p2: { x: sourceX + dx, y: sourceY + dy },
      };

      let closestIntersection: RayIntersection | null = null;

      for (const seg of allSegments) {
        const hit = this.getIntersection(ray, seg);
        if (hit) {
          if (!closestIntersection || hit.param < closestIntersection.param) {
            closestIntersection = {
              x: hit.x,
              y: hit.y,
              param: hit.param,
              angle,
            };
          }
        }
      }

      if (closestIntersection) {
        // 최대 반경 제한 클램프
        const dist = Math.hypot(closestIntersection.x - sourceX, closestIntersection.y - sourceY);
        if (dist > maxRadius) {
          intersections.push({
            x: sourceX + Math.cos(angle) * maxRadius,
            y: sourceY + Math.sin(angle) * maxRadius,
            param: maxRadius / rayLength,
            angle,
          });
        } else {
          intersections.push(closestIntersection);
        }
      }
    }

    // 시야각 원뿔인 경우 광원 시작점을 폴리곤 시작/끝에 포함
    if (fovAngleRad !== undefined && headingRad !== undefined) {
      return [{ x: sourceX, y: sourceY }, ...intersections.map((i) => ({ x: i.x, y: i.y }))];
    }

    return intersections.map((i) => ({ x: i.x, y: i.y }));
  }

  /**
   * 레이와 선분의 2D 교차점 계산
   */
  private static getIntersection(
    r: Segment2D,
    s: Segment2D
  ): { x: number; y: number; param: number } | null {
    const r_px = r.p1.x;
    const r_py = r.p1.y;
    const r_dx = r.p2.x - r.p1.x;
    const r_dy = r.p2.y - r.p1.y;

    const s_px = s.p1.x;
    const s_py = s.p1.y;
    const s_dx = s.p2.x - s.p1.x;
    const s_dy = s.p2.y - s.p1.y;

    const r_mag = Math.hypot(r_dx, r_dy);
    const s_mag = Math.hypot(s_dx, s_dy);

    if (r_mag === 0 || s_mag === 0) return null;

    const denominator = r_dx * s_dy - r_dy * s_dx;
    if (denominator === 0) return null; // 평행

    const u = ((s_px - r_px) * r_dy - (s_py - r_py) * r_dx) / denominator;
    const t = ((s_px - r_px) * s_dy - (s_py - r_py) * s_dx) / denominator;

    // t는 광선(0.0 ~ 1.0), u는 선분(0.0 ~ 1.0)
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: r_px + t * r_dx,
        y: r_py + t * r_dy,
        param: t,
      };
    }

    return null;
  }
}
