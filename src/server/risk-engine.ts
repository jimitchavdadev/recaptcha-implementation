/**
 * Behavioral Risk Scoring Engine
 * Analyzes client kinetics, timing dynamics, and environment fingerprint to generate 0.0 - 1.0 score.
 */
import { RECAPTCHA_CONSTANTS } from '../common/constants.js';
import type { BrowserFingerprint, ClientTelemetry, MousePoint } from '../common/types.js';

export interface EvaluationResult {
  score: number;
  reasons: string[];
  metrics: {
    kineticScore: number;
    timingScore: number;
    environmentScore: number;
  };
}

export class RiskEngine {
  /**
   * Evaluates combined telemetry and fingerprint returning risk score and reason codes
   */
  public static evaluate(
    telemetry: ClientTelemetry,
    fingerprint?: BrowserFingerprint
  ): EvaluationResult {
    const reasons: string[] = [];

    const environmentScore = this.evaluateEnvironment(fingerprint, reasons);
    const kineticScore = this.evaluateKinetics(telemetry.mouseTrail, reasons);
    const timingScore = this.evaluateTiming(telemetry, reasons);

    // If blatant automation is flagged, drastically clamp final score
    const hasCriticalBotFlag = reasons.some((r) =>
      ['WEBDRIVER_FLAG_ACTIVE', 'HEADLESS_SCREEN_ANOMALY', 'ZERO_MOUSE_ENTROPY'].includes(r)
    );

    const { WEIGHTS } = RECAPTCHA_CONSTANTS;
    let combinedScore =
      environmentScore * WEIGHTS.ENVIRONMENT +
      kineticScore * WEIGHTS.KINETIC +
      timingScore * WEIGHTS.TIMING;

    if (hasCriticalBotFlag) {
      combinedScore = Math.min(combinedScore, 0.15);
    }

    return {
      score: Math.max(0.0, Math.min(1.0, Math.round(combinedScore * 100) / 100)),
      reasons,
      metrics: {
        kineticScore: Math.round(kineticScore * 100) / 100,
        timingScore: Math.round(timingScore * 100) / 100,
        environmentScore: Math.round(environmentScore * 100) / 100,
      },
    };
  }

  private static evaluateEnvironment(fp: BrowserFingerprint | undefined, reasons: string[]): number {
    if (!fp) return 0.5;
    let score = 1.0;

    if (fp.isWebdriver) {
      score -= 0.85;
      reasons.push('WEBDRIVER_FLAG_ACTIVE');
    }

    const [width, height] = fp.screenResolution || [0, 0];
    if (width === 0 || height === 0 || fp.colorDepth < 16) {
      score -= 0.6;
      reasons.push('HEADLESS_SCREEN_ANOMALY');
    }

    if (!fp.canvasHash || fp.canvasHash === '0000000000000000') {
      score -= 0.4;
      reasons.push('MISSING_OR_ZERO_CANVAS_FINGERPRINT');
    }

    if (fp.webglRenderer && /SwiftShader|llvmpipe|Software/i.test(fp.webglRenderer)) {
      score -= 0.5;
      reasons.push('SOFTWARE_EMULATED_GPU_DETECTED');
    }

    return Math.max(0, score);
  }

  private static evaluateKinetics(trail: MousePoint[] | undefined, reasons: string[]): number {
    if (!trail || trail.length === 0) {
      reasons.push('ZERO_MOUSE_POINTS_RECORDED');
      return 0.1;
    }

    if (trail.length < RECAPTCHA_CONSTANTS.MIN_MOUSE_POINTS_FOR_CHECKBOX) {
      reasons.push('INSUFFICIENT_MOUSE_POINTS');
      return 0.3;
    }

    // Measure total path distance vs straight displacement
    let pathDistance = 0;
    const angles: number[] = [];
    for (let i = 1; i < trail.length; i++) {
      const dx = trail[i].x - trail[i - 1].x;
      const dy = trail[i].y - trail[i - 1].y;
      pathDistance += Math.hypot(dx, dy);
      if (dx !== 0 || dy !== 0) {
        angles.push(Math.atan2(dy, dx));
      }
    }

    const start = trail[0];
    const end = trail[trail.length - 1];
    const directDisplacement = Math.hypot(end.x - start.x, end.y - start.y);

    // Bots often draw perfectly straight lines (displacement == pathDistance)
    const curvatureRatio = directDisplacement > 0 ? pathDistance / directDisplacement : 1.0;
    if (curvatureRatio <= 1.001 && trail.length > 5) {
      reasons.push('PERFECT_LINEAR_MOUSE_MOVEMENT');
      return 0.15;
    }

    // Calculate angular variance (humans constantly adjust path)
    const angleVariance = this.calculateVariance(angles);
    if (angleVariance < 0.02) {
      reasons.push('LOW_PATH_ANGULAR_ENTROPY');
      return 0.25;
    }

    return 0.95;
  }

  private static evaluateTiming(telemetry: ClientTelemetry, reasons: string[]): number {
    let score = 1.0;
    if (telemetry.dwellTimeMs < RECAPTCHA_CONSTANTS.MIN_PLAUSIBLE_DWELL_MS) {
      reasons.push('UNREALISTIC_SUBMISSION_SPEED');
      score -= 0.7;
    } else if (telemetry.dwellTimeMs < 800) {
      score -= 0.2;
    }

    // Keystroke pacing variance (scripts type with 0ms or fixed ms intervals)
    if (telemetry.keyStrokeIntervals && telemetry.keyStrokeIntervals.length >= 3) {
      const keyVar = this.calculateVariance(telemetry.keyStrokeIntervals);
      if (keyVar < 1.0) {
        reasons.push('SYNTHETIC_TYPING_CADENCE');
        score -= 0.4;
      }
    }

    return Math.max(0, score);
  }

  private static calculateVariance(arr: number[]): number {
    if (arr.length <= 1) return 0;
    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
    const variance = arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / (arr.length - 1);
    return variance;
  }
}
