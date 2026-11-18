/**
 * Interactive Demo Dashboard HTML Template
 * Provides live testing for v2 checkbox, v3 invisible execution, and bot simulations.
 */
export function getDemoHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Custom Bot Verification Engine (v2 & v3)</title>
  <style>
    :root { --p: #2563eb; --bg: #f8fafc; --card: #ffffff; --text: #0f172a; --bdr: #e2e8f0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
    .container { max-width: 960px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
    .card { background: var(--card); border: 1px solid var(--bdr); border-radius: 8px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h2 { margin-top: 0; font-size: 1.15rem; color: #1e293b; display: flex; align-items: center; justify-content: space-between; }
    .badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 9999px; background: #dbeafe; color: #1e40af; }
    button { background: var(--p); color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.9rem; }
    button:hover { background: #1d4ed8; }
    pre { background: #0f172a; color: #38bdf8; padding: 12px; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; max-height: 180px; }
    .meter { height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin: 8px 0; }
    .fill { height: 100%; width: 0%; transition: width 0.4s ease, background 0.4s; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1 style="margin:0 0 8px 0; font-size: 1.8rem;">🛡️ Bot Verification Engine (v2 & v3 Architecture)</h1>
    <p style="margin:0; color:#64748b; font-size: 0.95rem;">Client behavioral telemetry, kinetics entropy, PoW, and server verification built from scratch.</p>
  </div>
  <div class="grid">
    <div class="card">
      <h2>v2 Model <span class="badge">Checkbox & Challenge</span></h2>
      <p style="font-size:0.85rem; color:#64748b;">Tests mouse kinetics upon interaction. Suspicious scores trigger dynamic 3x3 challenge.</p>
      <div id="v2-widget-slot"></div>
      <div style="margin-top: 14px;">
        <pre id="v2-log">// Awaiting v2 interaction...</pre>
      </div>
    </div>
    <div class="card">
      <h2>v3 Model <span class="badge">Invisible Risk Score</span></h2>
      <p style="font-size:0.85rem; color:#64748b;">Frictionless background tracking. Computes 0.0 - 1.0 risk score bound to action.</p>
      <div style="display: flex; gap: 8px; margin-bottom: 10px;">
        <button onclick="runV3('login_submit')">Execute 'login'</button>
        <button onclick="runV3('checkout')">Execute 'checkout'</button>
      </div>
      <div>Score: <strong id="v3-score-label">--</strong></div>
      <div class="meter"><div id="v3-meter" class="fill"></div></div>
      <pre id="v3-log">// Click execute to inspect telemetry payload & verification</pre>
    </div>
    <div class="card" style="grid-column: 1 / -1;">
      <h2>Adversarial Bot Simulator <span class="badge">Synthetic Telemetry</span></h2>
      <p style="font-size:0.85rem; color:#64748b;">Simulate how the risk engine penalizes automation, headless scripts, and instantaneous clicks.</p>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 12px;">
        <button style="background:#16a34a;" onclick="runSimulation('human')">Human (Natural Curve)</button>
        <button style="background:#ea580c;" onclick="runSimulation('teleport_instant')">Bot: Instant Teleport (0ms)</button>
        <button style="background:#d97706;" onclick="runSimulation('linear_script')">Bot: Linear Coordinates</button>
        <button style="background:#dc2626;" onclick="runSimulation('headless_scraper')">Bot: Headless Puppeteer</button>
      </div>
      <pre id="sim-log">// Run any simulation above to inspect kinetic & environment analysis</pre>
    </div>
  </div>
</div>
<script>
  const siteKey = '6Lcustom_test_site_key_human_v3_v2';
  const secretKey = '6Lcustom_secret_key_super_secure_node_bun_demo';
  let mouseTrail = [];

  window.addEventListener('mousemove', (e) => {
    if (mouseTrail.length < 50) mouseTrail.push({ x: e.clientX, y: e.clientY, t: Date.now() });
  });

  const slot = document.getElementById('v2-widget-slot');
  slot.innerHTML = '<div style="border:1px solid #cbd5e1; background:#ffffff; padding:12px; border-radius:6px; display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="triggerV2()"><div id="v2-box" style="width:22px; height:22px; border:2px solid #94a3b8; background:#fff; border-radius:4px; display:flex; align-items:center; justify-content:center;"></div><span style="font-size:14px; font-weight:500;">I am a human</span></div>';

  async function triggerV2() {
    const box = document.getElementById('v2-box');
    box.innerHTML = '⌛';
    const res = await fetch('/api/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ version: 'v2', siteKey, telemetry: { dwellTimeMs: 1200, mouseTrail, keyStrokeIntervals: [120, 140] }, fingerprint: { isWebdriver: false, screenResolution:[1920, 1080], colorDepth: 24, canvasHash: 'demo_canvas_ok' } })
    });
    const data = await res.json();
    box.innerHTML = '✔';
    box.style.color = 'green';
    const ver = await fetch('/api/siteverify', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ secret: secretKey, response: data.token })
    });
    document.getElementById('v2-log').textContent = JSON.stringify(await ver.json(), null, 2);
  }

  async function runV3(action) {
    const res = await fetch('/api/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ version: 'v3', siteKey, action, telemetry: { dwellTimeMs: 1500, mouseTrail, keyStrokeIntervals: [90, 110, 130] }, fingerprint: { isWebdriver: false, screenResolution:[1920,1080], colorDepth:24, canvasHash:'demo_ok' } })
    });
    const data = await res.json();
    const ver = await fetch('/api/siteverify', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ secret: secretKey, response: data.token, action })
    });
    const verData = await ver.json();
    document.getElementById('v3-score-label').textContent = verData.score;
    const meter = document.getElementById('v3-meter');
    meter.style.width = (verData.score * 100) + '%';
    meter.style.background = verData.score >= 0.5 ? '#16a34a' : '#dc2626';
    document.getElementById('v3-log').textContent = JSON.stringify(verData, null, 2);
  }

  async function runSimulation(type) {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ type })
    });
    const data = await res.json();
    document.getElementById('sim-log').textContent = JSON.stringify(data, null, 2);
  }
</script>
</body>
</html>`;
}
