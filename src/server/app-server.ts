/**
 * reCAPTCHA Server & API Router
 * Implements token generation, challenge validation, siteverify endpoint, and demo UI serving.
 */
import { RECAPTCHA_CONSTANTS } from '../common/constants.js';
import { ChallengeManager } from './challenge-mgr.js';
import { RiskEngine } from './risk-engine.js';
import { TokenService } from './token-service.js';
import { ReCaptchaVerifier } from './verifier.js';
import { BotSimulator, type BotType } from '../demo/bot-simulator.js';
import { getDemoHtml } from '../demo/demo-page.js';

export function createServer(port = 3000, secretKey = RECAPTCHA_CONSTANTS.DEMO_SECRET_KEY) {
  const verifier = new ReCaptchaVerifier(secretKey);

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      // CORS headers for API calls
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Serve interactive demo HTML
      if (url.pathname === '/' || url.pathname === '/demo') {
        return new Response(getDemoHtml(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // /api/token - Evaluate telemetry & issue token or trigger v2 challenge
      if (url.pathname === '/api/token' && req.method === 'POST') {
        const body = (await req.json()) as any;
        const evalResult = RiskEngine.evaluate(body.telemetry || {}, body.fingerprint);
        const hostname = url.hostname;

        if (body.version === 'v2') {
          if (evalResult.score >= RECAPTCHA_CONSTANTS.V2_AUTO_PASS_THRESHOLD) {
            const token = TokenService.issueToken(
              { version: 'v2', siteKey: body.siteKey, hostname, score: evalResult.score, reasons: evalResult.reasons },
              secretKey
            );
            return Response.json({ status: 'passed', token, score: evalResult.score }, { headers: corsHeaders });
          } else {
            const challenge = ChallengeManager.createChallenge();
            return Response.json({ status: 'challenge_required', challenge, score: evalResult.score }, { headers: corsHeaders });
          }
        }

        // v3 mode: frictionless issuance with embedded risk score and action
        const token = TokenService.issueToken(
          { version: 'v3', siteKey: body.siteKey, hostname, score: evalResult.score, reasons: evalResult.reasons, action: body.action },
          secretKey
        );
        return Response.json({ token, score: evalResult.score, reasons: evalResult.reasons }, { headers: corsHeaders });
      }

      // /api/challenge/solve - Verify v2 challenge puzzle
      if (url.pathname === '/api/challenge/solve' && req.method === 'POST') {
        const body = (await req.json()) as { challengeId: string; selectedIds: string[] };
        const passed = ChallengeManager.verifySolution(body.challengeId, body.selectedIds);
        if (passed) {
          const token = TokenService.issueToken(
            { version: 'v2', siteKey: RECAPTCHA_CONSTANTS.DEMO_SITE_KEY, hostname: url.hostname, score: 0.9, reasons: ['PASSED_VISUAL_CHALLENGE'] },
            secretKey
          );
          return Response.json({ success: true, token }, { headers: corsHeaders });
        }
        return Response.json({ success: false, error: 'INCORRECT_SELECTION' }, { status: 400, headers: corsHeaders });
      }

      // /api/siteverify - Official reCAPTCHA-compatible backend verification
      if (url.pathname === '/api/siteverify' && req.method === 'POST') {
        let secret = '';
        let responseToken = '';
        let expectedAction: string | undefined;

        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await req.formData();
          secret = (formData.get('secret') as string) || '';
          responseToken = (formData.get('response') as string) || '';
          expectedAction = (formData.get('action') as string) || undefined;
        } else {
          const jsonBody = (await req.json()) as any;
          secret = jsonBody.secret || '';
          responseToken = jsonBody.response || '';
          expectedAction = jsonBody.action;
        }

        const result = verifier.verify({ secret, response: responseToken, expectedAction });
        return Response.json(result, { headers: corsHeaders });
      }

      // /api/simulate - Run live synthetic bot or human tests
      if (url.pathname === '/api/simulate' && req.method === 'POST') {
        const { type } = (await req.json()) as { type: string };
        const isHuman = type === 'human';
        const sim = isHuman
          ? { telemetry: BotSimulator.generateHumanTelemetry(), fingerprint: BotSimulator.generateHumanFingerprint() }
          : BotSimulator.generateBotTelemetry(type as BotType);

        const evalResult = RiskEngine.evaluate(sim.telemetry, sim.fingerprint);
        return Response.json({ type, evalResult, telemetry: sim.telemetry }, { headers: corsHeaders });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    },
  });

  return server;
}
