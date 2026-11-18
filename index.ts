/**
 * Custom reCAPTCHA v2 & v3 Engine
 * Main Entry Point - Exports library modules and boots server when executed directly.
 */
import { RECAPTCHA_CONSTANTS } from './src/common/constants.js';
import { CaptchaCrypto } from './src/common/crypto.js';
import { RiskEngine } from './src/server/risk-engine.js';
import { ChallengeManager } from './src/server/challenge-mgr.js';
import { TokenService } from './src/server/token-service.js';
import { ReCaptchaVerifier } from './src/server/verifier.js';
import { createServer } from './src/server/app-server.js';
import { BotSimulator } from './src/demo/bot-simulator.js';

// Export all public modules
export * from './src/common/types.js';
export * from './src/common/constants.js';
export * from './src/common/crypto.js';
export * from './src/server/risk-engine.js';
export * from './src/server/challenge-mgr.js';
export * from './src/server/token-service.js';
export * from './src/server/verifier.js';
export * from './src/server/app-server.js';
export * from './src/demo/bot-simulator.js';

// If run directly via Bun CLI, launch the HTTP server
if (import.meta.main) {
  const PORT = Number(process.env.PORT) || 3000;
  const server = createServer(PORT);

  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║             🛡️  CUSTOM RECAPTCHA ENGINE (v2 & v3)                 ║
╠════════════════════════════════════════════════════════════════════╣
║  • Server listening on:  http://localhost:${PORT}                    ║
║  • Interactive Demo:     http://localhost:${PORT}/demo               ║
║  • Siteverify API:       POST http://localhost:${PORT}/api/siteverify ║
║  • Default Site Key:     ${RECAPTCHA_CONSTANTS.DEMO_SITE_KEY}   ║
╚════════════════════════════════════════════════════════════════════╝
  `);
}
