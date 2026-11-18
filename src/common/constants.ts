/**
 * ReCAPTCHA Implementation - Constants and Configuration
 * Defines scoring weights, timeouts, error codes, and default keys.
 */

export const RECAPTCHA_CONSTANTS = {
  // Token validity window (Google reCAPTCHA tokens expire in 2 minutes)
  TOKEN_TTL_MS: 2 * 60 * 1000,

  // v2 visual challenge timeout
  CHALLENGE_TTL_MS: 60 * 1000,

  // Default passing score thresholds
  V3_HUMAN_THRESHOLD: 0.5,
  V2_AUTO_PASS_THRESHOLD: 0.75, // Above this, v2 checkbox passes without challenge

  // Weights for composite risk score
  WEIGHTS: {
    ENVIRONMENT: 0.35, // Webdriver, canvas, headless indicators
    KINETIC: 0.40,     // Mouse trajectory entropy & curvature
    TIMING: 0.25,      // Dwell time & interaction pacing
  },

  // Minimum required human dwell time in ms (bots submit in < 100ms)
  MIN_PLAUSIBLE_DWELL_MS: 400,

  // Minimum number of mouse coordinate points expected for human gesture
  MIN_MOUSE_POINTS_FOR_CHECKBOX: 8,

  // Error codes compatible with Google reCAPTCHA siteverify
  ERROR_CODES: {
    MISSING_SECRET: 'missing-input-secret',
    INVALID_SECRET: 'invalid-input-secret',
    MISSING_RESPONSE: 'missing-input-response',
    INVALID_RESPONSE: 'invalid-input-response',
    BAD_REQUEST: 'bad-request',
    TIMEOUT_OR_DUPLICATE: 'timeout-or-duplicate',
    ACTION_MISMATCH: 'action-mismatch',
    SCORE_TOO_LOW: 'score-below-threshold',
  },

  // Default demo credentials
  DEMO_SITE_KEY: '6Lcustom_test_site_key_human_v3_v2',
  DEMO_SECRET_KEY: '6Lcustom_secret_key_super_secure_node_bun_demo',
} as const;
