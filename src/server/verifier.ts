/**
 * reCAPTCHA Server-Side Verifier
 * Implements the siteverify verification specification with score evaluation and action matching.
 */
import { RECAPTCHA_CONSTANTS } from '../common/constants.js';
import type { VerifyRequest, VerifyResponse } from '../common/types.js';
import { TokenService } from './token-service.js';

export class ReCaptchaVerifier {
  private secretKey: string;

  constructor(secretKey: string = RECAPTCHA_CONSTANTS.DEMO_SECRET_KEY) {
    this.secretKey = secretKey;
  }

  /**
   * Verifies a client submitted token against this server's secret key
   */
  public verify(req: VerifyRequest): VerifyResponse {
    const errorCodes: string[] = [];

    // Validate inputs
    if (!req.secret) {
      errorCodes.push(RECAPTCHA_CONSTANTS.ERROR_CODES.MISSING_SECRET);
    } else if (req.secret !== this.secretKey) {
      errorCodes.push(RECAPTCHA_CONSTANTS.ERROR_CODES.INVALID_SECRET);
    }

    if (!req.response || typeof req.response !== 'string' || req.response.trim() === '') {
      errorCodes.push(RECAPTCHA_CONSTANTS.ERROR_CODES.MISSING_RESPONSE);
    }

    if (errorCodes.length > 0) {
      return { success: false, 'error-codes': errorCodes };
    }

    // Cryptographic token unpacking & replay check
    const validation = TokenService.validateToken(req.response, this.secretKey, true);
    if (!validation.valid || !validation.payload) {
      return {
        success: false,
        'error-codes': [validation.error || RECAPTCHA_CONSTANTS.ERROR_CODES.INVALID_RESPONSE],
      };
    }

    const payload = validation.payload;
    const challenge_ts = new Date(payload.timestamp).toISOString();
    const hostname = payload.hostname;
    const score = payload.score;
    const action = payload.action;

    // Check v3 contextual action matching if an expected action was provided
    if (req.expectedAction && payload.version === 'v3') {
      if (req.expectedAction !== action) {
        return {
          success: false,
          score,
          action,
          challenge_ts,
          hostname,
          version: payload.version,
          'error-codes': [RECAPTCHA_CONSTANTS.ERROR_CODES.ACTION_MISMATCH],
          risk_reasons: payload.reasons,
        };
      }
    }

    // Check score threshold (default 0.5)
    const threshold = req.scoreThreshold ?? RECAPTCHA_CONSTANTS.V3_HUMAN_THRESHOLD;
    if (score < threshold) {
      return {
        success: false,
        score,
        action,
        challenge_ts,
        hostname,
        version: payload.version,
        'error-codes': [RECAPTCHA_CONSTANTS.ERROR_CODES.SCORE_TOO_LOW],
        risk_reasons: payload.reasons,
      };
    }

    return {
      success: true,
      score,
      action,
      challenge_ts,
      hostname,
      version: payload.version,
      risk_reasons: payload.reasons,
    };
  }
}
