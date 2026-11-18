/**
 * ReCAPTCHA Implementation - Common Types
 * Covers data structures for v2/v3 telemetry, tokens, challenges, and verification.
 */

export type CaptchaVersion = 'v2' | 'v3';

export interface MousePoint {
  x: number;
  y: number;
  t: number; // millisecond timestamp relative to session start
}

export interface ClientTelemetry {
  dwellTimeMs: number; // Time from page load to trigger
  mouseTrail: MousePoint[];
  keyStrokeIntervals: number[]; // Time deltas between keypresses
  scrollCount: number;
  clickCoordinates?: { x: number; y: number };
  powSolution?: { nonce: string; answer: number; durationMs: number };
}

export interface BrowserFingerprint {
  isWebdriver: boolean;
  userAgent: string;
  language: string;
  languages: string[];
  screenResolution: [number, number];
  colorDepth: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
  canvasHash: string;
  webglVendor?: string;
  webglRenderer?: string;
  hasTouchSupport: boolean;
  timezoneOffset: number;
}

export interface SignedTokenPayload {
  version: CaptchaVersion;
  tokenId: string;
  siteKey: string;
  hostname: string;
  action?: string; // v3 action name (e.g., 'login', 'checkout')
  timestamp: number;
  score: number; // 0.0 (bot) to 1.0 (human)
  reasons: string[];
  nonce: string;
}

export interface VerifyRequest {
  secret: string;
  response: string; // The token submitted by client
  remoteip?: string;
  expectedAction?: string;
  scoreThreshold?: number;
}

export interface VerifyResponse {
  success: boolean;
  score?: number; // v3 score 0.0 - 1.0
  action?: string; // v3 action tag
  challenge_ts?: string; // ISO timestamp
  hostname?: string;
  version?: CaptchaVersion;
  'error-codes'?: string[];
  risk_reasons?: string[];
  metrics?: {
    kineticScore: number;
    timingScore: number;
    environmentScore: number;
  };
}

export interface ChallengeItem {
  id: string;
  label: string; // e.g. "car", "boat", "bus"
  svgPattern: string; // inline vector representation for zero external assets
  isTarget: boolean;
}

export interface VisualChallenge {
  challengeId: string;
  prompt: string; // e.g. "Select all squares with a car"
  targetCategory: string;
  items: { id: string; svgPattern: string }[];
  expiresAt: number;
}
