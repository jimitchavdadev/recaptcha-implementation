# API Reference

## 1. Client SDK Methods

### `customCaptcha.render(containerId, options)`
Renders a v2 "I'm not a robot" checkbox widget into the specified DOM container.
- **Parameters:**
  - `containerId` (`string`): Target element ID.
  - `options.siteKey` (`string`): Public site key.
  - `options.onVerify` (`(token: string) => void`): Callback fired upon successful verification.

### `customCaptcha.execute(siteKey, options)`
Executes background risk evaluation for v3 and returns a signed token.
- **Parameters:**
  - `siteKey` (`string`): Public site key.
  - `options.action` (`string`): Action identifier (e.g., `'login'`, `'submit_order'`).
- **Returns:** `Promise<string>` resolving to the HMAC-signed token.

---

## 2. Server REST Endpoints

### `POST /api/siteverify`
Verifies user response token against server secret key (compatible with standard Google reCAPTCHA format).
- **Request Body (JSON or `application/x-www-form-urlencoded`):**
  - `secret` (`string`, required): Shared server secret key.
  - `response` (`string`, required): The token submitted by the client.
  - `action` (`string`, optional): Expected v3 contextual action.
  - `scoreThreshold` (`number`, optional): Minimum passing score (default: `0.5`).

- **Success Response:**
  ```json
  {
    "success": true,
    "score": 0.92,
    "action": "login",
    "challenge_ts": "2026-11-18T10:00:00.000Z",
    "hostname": "localhost",
    "version": "v3"
  }
  ```

- **Failure Response:**
  ```json
  {
    "success": false,
    "score": 0.12,
    "error-codes": ["score-below-threshold"],
    "risk_reasons": ["WEBDRIVER_FLAG_ACTIVE", "UNREALISTIC_SUBMISSION_SPEED"]
  }
  ```

### `POST /api/token`
Generates a signed token or serves a v2 challenge session based on telemetry evaluation.

### `POST /api/challenge/solve`
Verifies 3x3 visual category puzzle selection and issues a passing token.
