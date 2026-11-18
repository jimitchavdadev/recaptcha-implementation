/**
 * reCAPTCHA Signed Token Service
 * Issues signed verification tokens and enforces single-use replay protection with TTL.
 */
import { RECAPTCHA_CONSTANTS } from '../common/constants.js';
import { CaptchaCrypto } from '../common/crypto.js';
import type { CaptchaVersion, SignedTokenPayload } from '../common/types.js';

export interface IssueTokenParams {
  version: CaptchaVersion;
  siteKey: string;
  hostname: string;
  score: number;
  reasons: string[];
  action?: string;
}

export class TokenService {
  // Store consumed tokenIds to prevent replay attacks
  private static consumedTokens = new Map<string, number>();

  /**
   * Issues a cryptographically signed token string
   */
  public static issueToken(params: IssueTokenParams, secretKey: string): string {
    const tokenId = `tok_${CaptchaCrypto.generateNonce(16)}`;
    const now = Date.now();

    const payload: SignedTokenPayload = {
      version: params.version,
      tokenId,
      siteKey: params.siteKey,
      hostname: params.hostname,
      action: params.action,
      timestamp: now,
      score: params.score,
      reasons: params.reasons,
      nonce: CaptchaCrypto.generateNonce(8),
    };

    return CaptchaCrypto.packToken(payload, secretKey);
  }

  /**
   * Validates token cryptographic integrity, TTL, and replay status.
   * If valid and consume=true, marks token as consumed.
   */
  public static validateToken(
    tokenString: string,
    secretKey: string,
    consume = true
  ): { valid: boolean; payload?: SignedTokenPayload; error?: string } {
    this.cleanExpiredConsumed();

    const payload = CaptchaCrypto.unpackAndVerifyToken(tokenString, secretKey);
    if (!payload) {
      return { valid: false, error: RECAPTCHA_CONSTANTS.ERROR_CODES.INVALID_RESPONSE };
    }

    const now = Date.now();
    const age = now - payload.timestamp;

    // Check expiration (2 minutes standard)
    if (age < 0 || age > RECAPTCHA_CONSTANTS.TOKEN_TTL_MS) {
      return { valid: false, error: RECAPTCHA_CONSTANTS.ERROR_CODES.TIMEOUT_OR_DUPLICATE };
    }

    // Check replay attack prevention
    if (this.consumedTokens.has(payload.tokenId)) {
      return { valid: false, error: RECAPTCHA_CONSTANTS.ERROR_CODES.TIMEOUT_OR_DUPLICATE };
    }

    if (consume) {
      this.consumedTokens.set(payload.tokenId, payload.timestamp + RECAPTCHA_CONSTANTS.TOKEN_TTL_MS);
    }

    return { valid: true, payload };
  }

  /**
   * Cleans consumed tokens table past their natural TTL
   */
  private static cleanExpiredConsumed(): void {
    const now = Date.now();
    for (const [tokenId, expiresAt] of this.consumedTokens.entries()) {
      if (now > expiresAt) {
        this.consumedTokens.delete(tokenId);
      }
    }
  }

  /**
   * Clears state for testing
   */
  public static resetStateForTests(): void {
    this.consumedTokens.clear();
  }
}
