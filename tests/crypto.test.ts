import { describe, expect, test } from 'bun:test';
import { CaptchaCrypto } from '../src/common/crypto.js';
import type { SignedTokenPayload } from '../src/common/types.js';

describe('CaptchaCrypto', () => {
  const secretKey = 'super_secret_test_key_123';

  test('generates random hex nonce with specified length', () => {
    const nonce = CaptchaCrypto.generateNonce(16);
    expect(nonce).toBeDefined();
    expect(nonce.length).toBe(32); // 16 bytes = 32 hex chars
  });

  test('encodes and decodes base64url accurately', () => {
    const original = 'Hello ReCAPTCHA v2 & v3 World! / + =';
    const encoded = CaptchaCrypto.base64UrlEncode(original);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    const decoded = CaptchaCrypto.base64UrlDecode(encoded);
    expect(decoded).toBe(original);
  });

  test('signs and validates token payload accurately', () => {
    const payload: SignedTokenPayload = {
      version: 'v3',
      tokenId: 'tok_test_999',
      siteKey: 'site_123',
      hostname: 'localhost',
      action: 'checkout',
      timestamp: Date.now(),
      score: 0.95,
      reasons: [],
      nonce: 'nonce_abc',
    };

    const token = CaptchaCrypto.packToken(payload, secretKey);
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(2);

    const verified = CaptchaCrypto.unpackAndVerifyToken(token, secretKey);
    expect(verified).not.toBeNull();
    expect(verified?.tokenId).toBe(payload.tokenId);
    expect(verified?.score).toBe(0.95);
    expect(verified?.action).toBe('checkout');
  });

  test('rejects token when secret key is incorrect', () => {
    const payload: SignedTokenPayload = {
      version: 'v3',
      tokenId: 'tok_test_fail',
      siteKey: 'site_123',
      hostname: 'localhost',
      timestamp: Date.now(),
      score: 0.8,
      reasons: [],
      nonce: 'nonce_123',
    };

    const token = CaptchaCrypto.packToken(payload, secretKey);
    const result = CaptchaCrypto.unpackAndVerifyToken(token, 'wrong_secret_key');
    expect(result).toBeNull();
  });

  test('rejects tampered payload', () => {
    const payload: SignedTokenPayload = {
      version: 'v3',
      tokenId: 'tok_test_tamper',
      siteKey: 'site_123',
      hostname: 'localhost',
      timestamp: Date.now(),
      score: 0.2, // original low score
      reasons: ['BOT'],
      nonce: 'nonce_tamper',
    };

    const token = CaptchaCrypto.packToken(payload, secretKey);
    const [payloadB64, sig] = token.split('.');

    // Tamper score to 0.99
    const tamperedPayload = { ...payload, score: 0.99 };
    const tamperedPayloadB64 = CaptchaCrypto.base64UrlEncode(JSON.stringify(tamperedPayload));
    const tamperedToken = `${tamperedPayloadB64}.${sig}`;

    const result = CaptchaCrypto.unpackAndVerifyToken(tamperedToken, secretKey);
    expect(result).toBeNull();
  });

  test('quickHash creates consistent sha256 fingerprint', () => {
    const hash1 = CaptchaCrypto.quickHash('canvas_fingerprint_test_data');
    const hash2 = CaptchaCrypto.quickHash('canvas_fingerprint_test_data');
    const hash3 = CaptchaCrypto.quickHash('canvas_fingerprint_different');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(16);
  });
});
