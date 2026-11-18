/**
 * Client Telemetry Sensor
 * Passively captures user interaction kinetics: mouse trails, key intervals, dwell time, and scrolls.
 */
import type { ClientTelemetry, MousePoint } from '../common/types.js';

export class ClientSensor {
  private startTime: number;
  private mouseTrail: MousePoint[] = [];
  private keyStrokeIntervals: number[] = [];
  private lastKeyTime = 0;
  private scrollCount = 0;
  private clickCoords?: { x: number; y: number };
  private maxTrailPoints = 64; // Keep telemetry lightweight
  private active = false;

  constructor() {
    this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  /**
   * Attaches event listeners to window / document
   */
  public start(): void {
    if (this.active || typeof window === 'undefined') return;
    this.active = true;

    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    window.addEventListener('keydown', this.handleKeyDown, { passive: true });
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('click', this.handleClick, { passive: true });
  }

  public stop(): void {
    if (!this.active || typeof window === 'undefined') return;
    this.active = false;

    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('click', this.handleClick);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.mouseTrail.length >= this.maxTrailPoints) {
      // Discard older mid-points to maintain curve head and tail
      this.mouseTrail.splice(1, 1);
    }
    const t = Math.round(performance.now() - this.startTime);
    this.mouseTrail.push({ x: Math.round(e.clientX), y: Math.round(e.clientY), t });
  };

  private handleKeyDown = (): void => {
    const now = performance.now();
    if (this.lastKeyTime > 0) {
      const delta = Math.round(now - this.lastKeyTime);
      if (this.keyStrokeIntervals.length < 32) {
        this.keyStrokeIntervals.push(delta);
      }
    }
    this.lastKeyTime = now;
  };

  private handleScroll = (): void => {
    this.scrollCount++;
  };

  private handleClick = (e: MouseEvent): void => {
    this.clickCoords = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
  };

  /**
   * Returns current telemetry snapshot
   */
  public getTelemetry(): ClientTelemetry {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dwellTimeMs = Math.round(now - this.startTime);

    return {
      dwellTimeMs,
      mouseTrail: [...this.mouseTrail],
      keyStrokeIntervals: [...this.keyStrokeIntervals],
      scrollCount: this.scrollCount,
      clickCoordinates: this.clickCoords,
    };
  }

  public reset(): void {
    this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.mouseTrail = [];
    this.keyStrokeIntervals = [];
    this.lastKeyTime = 0;
    this.scrollCount = 0;
    this.clickCoords = undefined;
  }
}
