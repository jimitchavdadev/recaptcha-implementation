import { describe, expect, test } from 'bun:test';
import { RiskEngine } from '../src/server/risk-engine.js';
import { BotSimulator } from '../src/demo/bot-simulator.js';

describe('RiskEngine Behavioral Scoring', () => {
  test('scores natural human behavior above 0.8', () => {
    const telemetry = BotSimulator.generateHumanTelemetry(2000);
    const fingerprint = BotSimulator.generateHumanFingerprint();

    const result = RiskEngine.evaluate(telemetry, fingerprint);
    expect(result.score).toBeGreaterThanOrEqual(0.8);
    expect(result.metrics.kineticScore).toBeGreaterThanOrEqual(0.8);
    expect(result.metrics.environmentScore).toBe(1.0);
    expect(result.reasons.length).toBe(0);
  });

  test('penalizes webdriver automation flag heavily', () => {
    const telemetry = BotSimulator.generateHumanTelemetry();
    const fingerprint = {
      ...BotSimulator.generateHumanFingerprint(),
      isWebdriver: true,
    };

    const result = RiskEngine.evaluate(telemetry, fingerprint);
    expect(result.score).toBeLessThanOrEqual(0.2);
    expect(result.reasons).toContain('WEBDRIVER_FLAG_ACTIVE');
  });

  test('detects and penalizes instantaneous teleport clicks (< 100ms, 0 points)', () => {
    const bot = BotSimulator.generateBotTelemetry('teleport_instant');
    const result = RiskEngine.evaluate(bot.telemetry, bot.fingerprint);

    expect(result.score).toBeLessThanOrEqual(0.15);
    expect(result.reasons).toContain('ZERO_MOUSE_POINTS_RECORDED');
    expect(result.reasons).toContain('UNREALISTIC_SUBMISSION_SPEED');
  });

  test('detects perfectly straight linear mouse trajectories with 0 curve', () => {
    const bot = BotSimulator.generateBotTelemetry('linear_script');
    const result = RiskEngine.evaluate(bot.telemetry, bot.fingerprint);

    expect(result.reasons).toContain('PERFECT_LINEAR_MOUSE_MOVEMENT');
    expect(result.score).toBeLessThan(0.6);
  });

  test('detects headless screen anomalies (0x0 resolution)', () => {
    const bot = BotSimulator.generateBotTelemetry('headless_scraper');
    const result = RiskEngine.evaluate(bot.telemetry, bot.fingerprint);

    expect(result.reasons).toContain('HEADLESS_SCREEN_ANOMALY');
    expect(result.score).toBeLessThanOrEqual(0.15);
  });

  test('handles missing or empty telemetry gracefully with safe bot default', () => {
    const result = RiskEngine.evaluate({
      dwellTimeMs: 0,
      mouseTrail: [],
      keyStrokeIntervals: [],
      scrollCount: 0,
    });

    expect(result.score).toBeLessThan(0.5);
    expect(result.reasons).toContain('ZERO_MOUSE_POINTS_RECORDED');
    expect(result.reasons).toContain('UNREALISTIC_SUBMISSION_SPEED');
  });
});
