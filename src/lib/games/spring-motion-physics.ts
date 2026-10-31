/**
 * @file spring-motion-physics.ts
 * @description 쫀득한 젤리 피직스 & 3D 카드 틸트 스프링 모션 이펙터
 * - 댐핑 스프링 오실레이터 (Damped Spring Harmonic Oscillator)
 * - Balatro 스타일 동적 3D 카드 틸트 & 바운스 솔버 (Card 3D Tilt Solver)
 * - UI 스케일 & 스퀴시(Squash & Stretch) 젤리 바운스 이펙터
 */

export interface SpringConfig {
  stiffness: number; // 탄성 계수 k (기본값: 180)
  damping: number; // 감쇠 계수 c (기본값: 12)
  mass: number; // 질량 m (기본값: 1.0)
  precision?: number; // 정지 판정 임계치 (기본값: 0.001)
}

/**
 * 1차원 댐핑 스프링 오실레이터
 */
export class DampedSpringOscillator {
  public value: number;
  public velocity = 0;
  public target: number;

  private readonly stiffness: number;
  private readonly damping: number;
  private readonly mass: number;
  private readonly precision: number;

  constructor(initialValue = 0, config?: Partial<SpringConfig>) {
    this.value = initialValue;
    this.target = initialValue;
    this.stiffness = config?.stiffness ?? 180;
    this.damping = config?.damping ?? 12;
    this.mass = config?.mass ?? 1.0;
    this.precision = config?.precision ?? 0.001;
  }

  public setTarget(target: number): void {
    this.target = target;
  }

  public setImmediate(val: number): void {
    this.value = val;
    this.target = val;
    this.velocity = 0;
  }

  public addImpulse(impulse: number): void {
    this.velocity += impulse / this.mass;
  }

  /**
   * 세미-암시적 오일러 (Semi-implicit Euler) 적분으로 안정적인 스프링 시뮬레이션
   */
  public step(dt: number): number {
    const displacement = this.value - this.target;
    const springForce = -this.stiffness * displacement;
    const dampingForce = -this.damping * this.velocity;
    const acceleration = (springForce + dampingForce) / this.mass;

    this.velocity += acceleration * dt;
    this.value += this.velocity * dt;

    if (
      Math.abs(this.velocity) < this.precision &&
      Math.abs(this.value - this.target) < this.precision
    ) {
      this.value = this.target;
      this.velocity = 0;
    }

    return this.value;
  }

  public isSettled(): boolean {
    return (
      this.velocity === 0 && Math.abs(this.value - this.target) < this.precision
    );
  }
}

/**
 * Balatro 스타일 3D 카드 틸트 & 물리 반응 솔버
 */
export class Card3DTiltSolver {
  private pitchSpring = new DampedSpringOscillator(0, { stiffness: 220, damping: 14 });
  private rollSpring = new DampedSpringOscillator(0, { stiffness: 220, damping: 14 });
  private scaleSpring = new DampedSpringOscillator(1.0, { stiffness: 260, damping: 16 });

  private lastPointerX = 0;
  private lastPointerY = 0;

  /**
   * 포인터(마우스/터치)의 상대적 카드 내부 위치(-0.5 ~ +0.5) 및 이동 델타 반영
   */
  public updatePointer(
    normX: number, // -0.5 (좌) ~ 0.5 (우)
    normY: number, // -0.5 (상) ~ 0.5 (하)
    isHovered: boolean,
    isDragging: boolean,
    dt: number
  ): { pitchDeg: number; rollDeg: number; scale: number; transformCss: string } {
    const targetScale = isDragging ? 1.15 : isHovered ? 1.06 : 1.0;
    this.scaleSpring.setTarget(targetScale);

    if (isHovered || isDragging) {
      const deltaX = normX - this.lastPointerX;
      const deltaY = normY - this.lastPointerY;

      // 위치 기반 기울임 + 이동 가속도 기반 오버슈트 틸트
      const targetPitch = normY * -24 + deltaY * -40;
      const targetRoll = normX * 24 + deltaX * 40;

      this.pitchSpring.setTarget(targetPitch);
      this.rollSpring.setTarget(targetRoll);
    } else {
      this.pitchSpring.setTarget(0);
      this.rollSpring.setTarget(0);
    }

    this.lastPointerX = normX;
    this.lastPointerY = normY;

    const pitch = this.pitchSpring.step(dt);
    const roll = this.rollSpring.step(dt);
    const scale = this.scaleSpring.step(dt);

    const transformCss = `perspective(800px) rotateX(${pitch.toFixed(
      2
    )}deg) rotateY(${roll.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

    return {
      pitchDeg: pitch,
      rollDeg: roll,
      scale,
      transformCss,
    };
  }

  public triggerJuicePop(scaleImpulse = 0.25): void {
    this.scaleSpring.addImpulse(scaleImpulse * 50);
  }
}

/**
 * 스쿼시 & 스트레치 (Squash & Stretch) 젤리 바운스 이펙터
 */
export class JellySquashStretch2D {
  private scaleX = new DampedSpringOscillator(1.0, { stiffness: 300, damping: 12 });
  private scaleY = new DampedSpringOscillator(1.0, { stiffness: 300, damping: 12 });

  /**
   * 충격(착지 또는 피격) 시 부피 보존형 스쿼시 연출 (Y축 압축, X축 팽창)
   */
  public impactSquash(intensity = 0.3): void {
    // Y는 찌그러지고, X는 부피를 보존하기 위해 팽창
    this.scaleY.addImpulse(-intensity * 80);
    this.scaleX.addImpulse(intensity * 80);
  }

  public step(dt: number): { sx: number; sy: number } {
    return {
      sx: this.scaleX.step(dt),
      sy: this.scaleY.step(dt),
    };
  }
}
