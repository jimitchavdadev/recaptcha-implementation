/**
 * Cryptographic Utilities for reCAPTCHA Tokens
 * Handles HMAC-SHA256 signature, token pack/unpack, and tamper verification.
 */
import { createHmac, randomBytes } from 'crypto';
import type { SignedTokenPayload } from './types.js';

export class CaptchaCrypto {
  /**
   * Generates a cryptographically secure random hexadecimal nonce
   */
  public static generateNonce(bytes = 16): string {
    return randomBytes(bytes).toString('hex');
  }

  /**
   * Encodes string or object into base64url format
   */
  public static base64UrlEncode(data: string | object): string {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    return Buffer.from(raw, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Decodes base64url string to UTF-8
   */
  public static base64UrlDecode(data: string): string {
    let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Generates HMAC-SHA256 signature for a given text payload
   */
  public static sign(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('base64url');
  }

  /**
   * Packs token payload into signed composite token string: `<payloadBase64Url>.<signatureBase64Url>`
   */
  public static packToken(payload: SignedTokenPayload, secret: string): string {
    const serialized = JSON.stringify(payload);
    const encodedPayload = this.base64UrlEncode(serialized);
    const signature = this.sign(encodedPayload, secret);
    return `${encodedPayload}.${signature}`;
  }

  /**
   * Unpacks and cryptographically validates token against secret key.
   * Returns null if signature is invalid or payload has been tampered with.
   */
  public static unpackAndVerifyToken(token: string, secret: string): SignedTokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, providedSignature] = parts;
    const expectedSignature = this.sign(encodedPayload, secret);

    // Constant time comparison to prevent timing attacks
    if (providedSignature.length !== expectedSignature.length) return null;
    let mismatch = 0;
    for (let i = 0; i < providedSignature.length; i++) {
      mismatch |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    if (mismatch !== 0) return null;

    try {
      const jsonStr = this.base64UrlDecode(encodedPayload);
      const parsed = JSON.parse(jsonStr) as SignedTokenPayload;
      if (!parsed.tokenId || !parsed.timestamp || typeof parsed.score !== 'number') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Simple hash utility for canvas and browser signals
   */
  public static quickHash(str: string): string {
    const hmac = createHmac('sha256', 'salt_fp_2026');
    hmac.update(str);
    return hmac.digest('hex').slice(0, 16);
  }
}
