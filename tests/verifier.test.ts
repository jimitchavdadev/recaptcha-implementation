import { beforeEach, describe, expect, test } from 'bun:test';
import { RECAPTCHA_CONSTANTS } from '../src/common/constants.js';
import { TokenService } from '../src/server/token-service.js';
import { ReCaptchaVerifier } from '../src/server/verifier.js';

describe('ReCaptchaVerifier (siteverify API specification)', () => {
  const secretKey = 'test_secret_for_verifier_suite';
  let verifier: ReCaptchaVerifier;

  beforeEach(() => {
    verifier = new ReCaptchaVerifier(secretKey);
    TokenService.resetStateForTests();
  });

  test('fails if secret key is missing', () => {
    const res = verifier.verify({ secret: '', response: 'some_token' });
    expect(res.success).toBe(false);
    expect(res['error-codes']).toContain(RECAPTCHA_CONSTANTS.ERROR_CODES.MISSING_SECRET);
  });

  test('fails if secret key is invalid', () => {
    const res = verifier.verify({ secret: 'wrong_secret', response: 'some_token' });
    expect(res.success).toBe(false);
    expect(res['error-codes']).toContain(RECAPTCHA_CONSTANTS.ERROR_CODES.INVALID_SECRET);
  });

  test('fails if response token is missing or empty', () => {
    const res = verifier.verify({ secret: secretKey, response: '' });
    expect(res.success).toBe(false);
    expect(res['error-codes']).toContain(RECAPTCHA_CONSTANTS.ERROR_CODES.MISSING_RESPONSE);
  });

  test('successfully verifies legitimate token', () => {
    const token = TokenService.issueToken(
      { version: 'v3', siteKey: 'site_123', hostname: 'example.com', score: 0.9, reasons: [], action: 'login' },
      secretKey
    );

    const res = verifier.verify({ secret: secretKey, response: token });
    expect(res.success).toBe(true);
    expect(res.score).toBe(0.9);
    expect(res.action).toBe('login');
    expect(res.hostname).toBe('example.com');
    expect(res.challenge_ts).toBeDefined();
  });

  test('enforces single-use replay protection', () => {
    const token = TokenService.issueToken(
      { version: 'v2', siteKey: 'site_123', hostname: 'example.com', score: 0.85, reasons: [] },
      secretKey
    );

    const first = verifier.verify({ secret: secretKey, response: token });
    expect(first.success).toBe(true);

    // Replay attack with same token must be rejected
    const replay = verifier.verify({ secret: secretKey, response: token });
    expect(replay.success).toBe(false);
    expect(replay['error-codes']).toContain(RECAPTCHA_CONSTANTS.ERROR_CODES.TIMEOUT_OR_DUPLICATE);
  });

  test('validates contextual action for v3 and fails on mismatch', () => {
    const token = TokenService.issueToken(
      { version: 'v3', siteKey: 'site_123', hostname: 'example.com', score: 0.9, reasons: [], action: 'cart_view' },
      secretKey
    );

    const mismatch = verifier.verify({
      secret: secretKey,
      response: token,
      expectedAction: 'checkout_submit', // Mismatch!
    });

    expect(mismatch.success).toBe(false);
    expect(mismatch['error-codes']).toContain(RECAPTCHA_CONSTANTS.ERROR_CODES.ACTION_MISMATCH);
  });

  test('rejects verification if score falls below required threshold', () => {
    const token = TokenService.issueToken(
      { version: 'v3', siteKey: 'site_123', hostname: 'example.com', score: 0.35, reasons: ['SUSPICIOUS_SPEED'] },
      secretKey
    );

    const res = verifier.verify({
      secret: secretKey,
      response: token,
      scoreThreshold: 0.6,
    });

    expect(res.success).toBe(false);
    expect(res['error-codes']).toContain(RECAPTCHA_CONSTANTS.ERROR_CODES.SCORE_TOO_LOW);
    expect(res.score).toBe(0.35);
  });
});
