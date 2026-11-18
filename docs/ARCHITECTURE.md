# Architectural Deep-Dive: How reCAPTCHA Works Under the Hood

## 1. Fundamental Difference: v2 vs v3

| Dimension | reCAPTCHA v2 ("The Gate") | reCAPTCHA v3 ("The Sensor") |
| :--- | :--- | :--- |
| **User Friction** | Visible checkbox / modal puzzle | Completely invisible (zero friction) |
| **Primary Trigger** | User clicks "I'm not a robot" | Application calls `execute(action)` |
| **Decision Maker** | Challenge gate decides pass/puzzle | Host backend interprets risk score (0.0 - 1.0) |
| **Challenge Fallback** | 3x3 category grid / visual selection | No visual challenge; backend decides step-up auth |
| **Action Binding** | Static per page container | Bound to specific business action (e.g., `checkout`) |

---

## 2. Telemetry and Risk Scoring Pipeline

```
  [Browser Client]
         │
         ├── Kinetic Sensor (Mouse trail, dwell time, typing cadence)
         ├── Fingerprint Collector (Webdriver, Canvas hash, WebGL vendor, Screen)
         └── Proof-of-Work Solver (Optional compute throttle)
         │
         ▼
  [Payload & Cryptographic Token]
         │
         ▼
  [Server Risk Engine]
         │
         ├── Kinetic Scoring (Curvature ratio, angular entropy, velocity variance)
         ├── Environment Scoring (Headless detection, screen depth, automation flags)
         └── Timing Scoring (Dwell time threshold, pacing variance)
         │
         ▼
  [HMAC-SHA256 Token Issuance / Siteverify API]
```

### Kinetic Analysis
- **Curvature Ratio:** Compares Euclidean distance $\Delta d = \sqrt{(x_n - x_0)^2 + (y_n - y_0)^2}$ to total traversed path length $\sum \Delta s_i$. Automated scripts often have ratio $\approx 1.0$ (perfect straight line). Human paths exhibit non-linear curvature (< 0.95).
- **Angular Entropy:** Real humans frequently make micro-adjustments in trajectory angle $\theta = \arctan2(\Delta y, \Delta x)$. Variance $\text{Var}(\theta) < 0.02$ indicates synthetic linear interpolation.

### Environment & Headless Detection
- **`navigator.webdriver`:** Flags Puppeteer, Selenium, and Playwright execution.
- **Screen Geometry:** Headless browsers often spawn with 0x0 or atypical dimensions and color depth $< 16$.
- **GPU Rasterization:** Canvas and WebGL tests detect software renderers like SwiftShader or llvmpipe.
