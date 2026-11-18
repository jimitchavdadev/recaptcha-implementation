# Custom reCAPTCHA Engine (v2 & v3)

A clean, modular, and fully reusable reCAPTCHA v2 and v3 engine built from scratch in TypeScript/Bun with zero external runtime dependencies.

[![Bun Tests](https://img.shields.io/badge/Bun%20Tests-27%20Passing-success)](https://bun.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Files Under 200 Lines](https://img.shields.io/badge/Code-100%25%20%3C200%20lines-brightgreen)](#modular-architecture)

---

## Overview: How reCAPTCHA Works

Google reCAPTCHA protects web applications from automated bots and malicious scrapers through two distinct paradigms:

1. **reCAPTCHA v2 ("The Gate"):**
   - Presents an interactive checkbox (*"I'm not a robot"*).
   - Evaluates client telemetry collected up to the click instant.
   - If human confidence is high, auto-passes immediately (`NOCAPTCHA`).
   - If ambiguous or suspicious, triggers a modal visual category challenge (e.g. 3x3 category grid).
   - Issues an HMAC-signed token upon resolution.

2. **reCAPTCHA v3 ("The Sensor"):**
   - Completely friction-free (zero user interaction or visual interruptions).
   - Passively gathers continuous behavioral heuristics (mouse kinetics, dwell time, typing cadence, canvas/webgl fingerprinting, and environment automation flags).
   - Generates an action-bound risk score from **`0.0`** (automated bot) to **`1.0`** (legitimate human).
   - Your backend queries `/api/siteverify` and enforces tailored business rules based on the score.

For architectural details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Features

- **Behavioral Kinetic Analysis:** Trajectory curvature ratios, angular entropy, and mouse path variance.
- **Headless & Automation Detection:** Detects `navigator.webdriver`, headless screen geometry, and software GPU rasterizers.
- **v2 Checkbox & Challenge Widget:** Self-contained UI with animated spinner, SVG visual challenge generator, and instant verification.
- **v3 Invisible Engine:** Action-bound `customCaptcha.execute('action')` with frictionless risk scoring.
- **Cryptographic Security:** Tamper-proof HMAC-SHA256 signatures, 2-minute token TTL, and single-use replay attack protection.
- **Proof-of-Work (PoW):** Optional compute-bound hash preimage solver for elevated risk scenarios.
- **Adversarial Bot Simulator:** Built-in generator simulating human curves, instant teleport clicks, linear bots, and headless scrapers.
- **Standard siteverify Specification:** Drop-in backend verification supporting JSON and `application/x-www-form-urlencoded`.

---

## Project Structure

All files are strictly **under 200 lines** for maximum readability, testability, and modularity:

```
recaptcha-implementation/
├── src/
│   ├── common/
│   │   ├── types.ts          # Core type definitions
│   │   ├── constants.ts      # Scoring weights, error codes, and default keys
│   │   └── crypto.ts         # HMAC-SHA256 signing, base64url, tamper checks
│   ├── server/
│   │   ├── risk-engine.ts    # Kinetic, timing, and environment risk evaluator
│   │   ├── challenge-mgr.ts  # v2 visual 3x3 challenge generator & validator
│   │   ├── token-service.ts  # Signed token issuance & replay prevention
│   │   ├── verifier.ts       # Siteverify API verification logic
│   │   └── app-server.ts     # Bun HTTP router & API handlers
│   ├── client/
│   │   ├── sensor.ts         # Mouse kinetics, dwell time, and key interval sensor
│   │   ├── fingerprint.ts    # Canvas hash, WebGL, webdriver & screen inspector
│   │   ├── pow.ts            # Proof-of-work solver for suspicious clients
│   │   ├── v2-widget.ts      # Checkbox UI, spinner, and challenge modal
│   │   ├── v3-engine.ts      # Invisible background risk score engine
│   │   └── sdk-entry.ts      # Global window.customCaptcha SDK API
│   └── demo/
│       ├── demo-page.ts      # Interactive HTML/CSS playground dashboard
│       └── bot-simulator.ts  # Synthetic human and bot telemetry profiles
├── tests/
│   ├── crypto.test.ts        # Cryptographic verification & tamper tests
│   ├── risk-engine.test.ts   # Behavioral scoring and anomaly tests
│   ├── challenge-mgr.test.ts # v2 challenge generation & solution tests
│   ├── verifier.test.ts      # siteverify contract & replay protection tests
│   └── e2e.test.ts           # End-to-end integration tests (human & bot)
├── docs/
│   ├── ARCHITECTURE.md       # Technical explanation of v2 vs v3 mechanics
│   └── API_REFERENCE.md      # SDK and REST API documentation
├── index.ts                  # Public package exports and CLI runner
└── package.json
```

---

## Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Run Test Suite
```bash
bun test
```
All 27 unit and end-to-end integration tests execute in `< 30ms`.

### 3. Start Demo Server
```bash
bun run demo
```
Open **`http://localhost:3000`** in your browser to explore the interactive dashboard:
- Test the **reCAPTCHA v2 checkbox** and visual challenge modal.
- Test **reCAPTCHA v3 invisible score evaluation** across contextual actions.
- Launch the **Adversarial Bot Simulator** to inspect real-time detection of headless browsers, teleport clicks, and linear trajectories.

---

## Client SDK Usage

```html
<script type="module" src="src/client/sdk-entry.ts"></script>
<div id="captcha-box"></div>

<script>
  // reCAPTCHA v2 Checkbox
  window.customCaptcha.render('captcha-box', {
    siteKey: 'your_site_key',
    onVerify: (token) => {
      console.log('v2 Verified Token:', token);
    }
  });

  // reCAPTCHA v3 Invisible
  async function onSubmit() {
    const token = await window.customCaptcha.execute('your_site_key', {
      action: 'login'
    });
    // Send token to your backend
  }
</script>
```

---

## Server Verification (`/api/siteverify`)

```bash
curl -X POST http://localhost:3000/api/siteverify \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "6Lcustom_secret_key_super_secure_node_bun_demo",
    "response": "<CLIENT_TOKEN>",
    "action": "login"
  }'
```

Response:
```json
{
  "success": true,
  "score": 0.95,
  "action": "login",
  "challenge_ts": "2026-11-18T15:30:00.000Z",
  "hostname": "localhost"
}
```

---

## License

MIT © [Jimit Chavda](https://github.com/jimitchavda)
