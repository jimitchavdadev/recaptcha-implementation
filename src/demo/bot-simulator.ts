/**
 * Bot and Human Behavior Simulation Generator
 * Generates synthetic behavioral profiles for end-to-end testing and demo playground.
 */
import type { BrowserFingerprint, ClientTelemetry, MousePoint } from '../common/types.js';

export type BotType = 'teleport_instant' | 'linear_script' | 'headless_scraper' | 'fast_submit';

export class BotSimulator {
  /**
   * Generates realistic human mouse movement with bezier curves, jitter, and realistic dwell time
   */
  public static generateHumanTelemetry(dwellMs = 1800): ClientTelemetry {
    const mouseTrail: MousePoint[] = [];
    const pointsCount = 25;
    const startX = 50 + Math.random() * 100;
    const startY = 100 + Math.random() * 80;
    const endX = 350 + Math.random() * 50;
    const endY = 400 + Math.random() * 50;

    // Control point for quadratic bezier curve
    const ctrlX = (startX + endX) / 2 + (Math.random() - 0.5) * 120;
    const ctrlY = (startY + endY) / 2 + (Math.random() - 0.5) * 120;

    for (let i = 0; i < pointsCount; i++) {
      const t = i / (pointsCount - 1);
      // Quadratic Bezier formula
      const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ctrlX + t * t * endX;
      const by = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * ctrlY + t * t * endY;

      // Add small natural human jitter
      const jitterX = (Math.random() - 0.5) * 3;
      const jitterY = (Math.random() - 0.5) * 3;
      const timestamp = Math.round(t * (dwellMs * 0.7) + 100);

      mouseTrail.push({
        x: Math.round(bx + jitterX),
        y: Math.round(by + jitterY),
        t: timestamp,
      });
    }

    return {
      dwellTimeMs: dwellMs,
      mouseTrail,
      keyStrokeIntervals: [110, 145, 95, 180, 130, 160], // Natural variance
      scrollCount: 2,
      clickCoordinates: { x: Math.round(endX), y: Math.round(endY) },
    };
  }

  public static generateHumanFingerprint(): BrowserFingerprint {
    return {
      isWebdriver: false,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
      language: 'en-US',
      languages: ['en-US', 'en'],
      screenResolution: [1920, 1080],
      colorDepth: 24,
      hardwareConcurrency: 8,
      deviceMemory: 16,
      canvasHash: 'a8f1b2c3d4e5f678',
      webglVendor: 'Intel Open Source Technology Center',
      webglRenderer: 'Mesa DRI Intel HD Graphics 620',
      hasTouchSupport: false,
      timezoneOffset: -330,
    };
  }

  /**
   * Generates malicious or automated bot signatures
   */
  public static generateBotTelemetry(type: BotType): {
    telemetry: ClientTelemetry;
    fingerprint: BrowserFingerprint;
  } {
    const baseFp: BrowserFingerprint = {
      isWebdriver: true,
      userAgent: 'Mozilla/5.0 (HeadlessChrome; Puppeteer)',
      language: 'en-US',
      languages: [],
      screenResolution: [800, 600],
      colorDepth: 24,
      hardwareConcurrency: 2,
      canvasHash: '0000000000000000',
      webglRenderer: 'SwiftShader Software Renderer',
      hasTouchSupport: false,
      timezoneOffset: 0,
    };

    if (type === 'teleport_instant') {
      return {
        telemetry: {
          dwellTimeMs: 45, // Instantaneous submit
          mouseTrail: [], // No trajectory
          keyStrokeIntervals: [0, 0, 0], // Injected keystrokes
          scrollCount: 0,
          clickCoordinates: { x: 200, y: 300 },
        },
        fingerprint: baseFp,
      };
    }

    if (type === 'linear_script') {
      // Perfectly straight line with 0 curve and fixed interval
      const points: MousePoint[] = [];
      for (let i = 0; i < 15; i++) {
        points.push({ x: 10 + i * 10, y: 10 + i * 10, t: i * 20 });
      }
      return {
        telemetry: {
          dwellTimeMs: 300,
          mouseTrail: points,
          keyStrokeIntervals: [50, 50, 50, 50], // Rigid zero-variance interval
          scrollCount: 0,
        },
        fingerprint: { ...baseFp, isWebdriver: false }, // Stealth puppeteer
      };
    }

    if (type === 'headless_scraper') {
      return {
        telemetry: {
          dwellTimeMs: 120,
          mouseTrail: [{ x: 50, y: 50, t: 10 }],
          keyStrokeIntervals: [],
          scrollCount: 0,
        },
        fingerprint: {
          ...baseFp,
          screenResolution: [0, 0], // Headless zero screen anomaly
          colorDepth: 8,
        },
      };
    }

    // fast_submit fallback
    return {
      telemetry: {
        dwellTimeMs: 150,
        mouseTrail: [{ x: 10, y: 10, t: 5 }],
        keyStrokeIntervals: [],
        scrollCount: 0,
      },
      fingerprint: baseFp,
    };
  }
}
