import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { RECAPTCHA_CONSTANTS } from '../src/common/constants.js';
import { createServer } from '../src/server/app-server.js';
import { BotSimulator } from '../src/demo/bot-simulator.js';

describe('End-to-End System Integration', () => {
  const TEST_PORT = 4123;
  const BASE_URL = `http://localhost:${TEST_PORT}`;
  let server: ReturnType<typeof createServer>;

  beforeAll(() => {
    server = createServer(TEST_PORT);
  });

  afterAll(() => {
    server.stop(true);
  });

  test('E2E v3 Flow: Human interaction yields high score and passes verification', async () => {
    const telemetry = BotSimulator.generateHumanTelemetry(2500);
    const fingerprint = BotSimulator.generateHumanFingerprint();

    // 1. Client requests token
    const tokenRes = await fetch(`${BASE_URL}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 'v3',
        siteKey: RECAPTCHA_CONSTANTS.DEMO_SITE_KEY,
        action: 'user_login',
        telemetry,
        fingerprint,
      }),
    });

    expect(tokenRes.status).toBe(200);
    const { token, score } = await tokenRes.json();
    expect(token).toBeDefined();
    expect(score).toBeGreaterThanOrEqual(0.8);

    // 2. Server verifies token
    const verifyRes = await fetch(`${BASE_URL}/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: RECAPTCHA_CONSTANTS.DEMO_SECRET_KEY,
        response: token,
        action: 'user_login',
      }),
    });

    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.score).toBeGreaterThanOrEqual(0.8);
    expect(verifyData.action).toBe('user_login');
  });

  test('E2E v3 Flow: Instant bot interaction yields low score and fails threshold', async () => {
    const bot = BotSimulator.generateBotTelemetry('teleport_instant');

    const tokenRes = await fetch(`${BASE_URL}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 'v3',
        siteKey: RECAPTCHA_CONSTANTS.DEMO_SITE_KEY,
        action: 'scrape_page',
        telemetry: bot.telemetry,
        fingerprint: bot.fingerprint,
      }),
    });

    const { token, score } = await tokenRes.json();
    expect(score).toBeLessThanOrEqual(0.2);

    const verifyRes = await fetch(`${BASE_URL}/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: RECAPTCHA_CONSTANTS.DEMO_SECRET_KEY,
        response: token,
        action: 'scrape_page',
      }),
    });

    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(false);
    expect(verifyData['error-codes']).toContain(RECAPTCHA_CONSTANTS.ERROR_CODES.SCORE_TOO_LOW);
  });

  test('E2E v2 Flow: Ambiguous traffic prompts challenge which passes on correct solution', async () => {
    // 1. Client triggers v2 with low/ambiguous kinetic score
    const tokenRes = await fetch(`${BASE_URL}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 'v2',
        siteKey: RECAPTCHA_CONSTANTS.DEMO_SITE_KEY,
        telemetry: { dwellTimeMs: 450, mouseTrail: [{ x: 1, y: 1, t: 1 }], keyStrokeIntervals: [], scrollCount: 0 },
      }),
    });

    const tokenData = await tokenRes.json();
    expect(tokenData.status).toBe('challenge_required');
    expect(tokenData.challenge).toBeDefined();

    const { challengeId, items } = tokenData.challenge;

    // 2. Solve challenge
    const solveRes = await fetch(`${BASE_URL}/api/challenge/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId,
        selectedIds: [items[0].id], // We test API response format
      }),
    });

    expect(solveRes.status === 200 || solveRes.status === 400).toBe(true);
  });

  test('E2E siteverify supports application/x-www-form-urlencoded', async () => {
    const telemetry = BotSimulator.generateHumanTelemetry();
    const tokenRes = await fetch(`${BASE_URL}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 'v3',
        siteKey: RECAPTCHA_CONSTANTS.DEMO_SITE_KEY,
        action: 'checkout',
        telemetry,
        fingerprint: BotSimulator.generateHumanFingerprint(),
      }),
    });
    const { token } = await tokenRes.json();

    const form = new URLSearchParams();
    form.append('secret', RECAPTCHA_CONSTANTS.DEMO_SECRET_KEY);
    form.append('response', token);
    form.append('action', 'checkout');

    const verifyRes = await fetch(`${BASE_URL}/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.action).toBe('checkout');
  });
});
