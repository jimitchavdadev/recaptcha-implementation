/**
 * reCAPTCHA v3 Invisible Risk Engine
 * Runs completely frictionless in the background and issues action-bound signed tokens.
 */
import { ClientFingerprint } from './fingerprint.js';
import { ClientSensor } from './sensor.js';

export interface V3Config {
  siteKey: string;
  apiEndpoint?: string; // Default '/api/token'
}

export class ReCaptchaV3Engine {
  private siteKey: string;
  private apiEndpoint: string;
  private sensor: ClientSensor;

  constructor(config: V3Config) {
    this.siteKey = config.siteKey;
    this.apiEndpoint = config.apiEndpoint || '/api/token';
    this.sensor = new ClientSensor();
    this.sensor.start();
  }

  /**
   * Generates a signed v3 token for a given contextual action (e.g. 'login', 'checkout')
   */
  public async execute(action: string): Promise<string> {
    const telemetry = this.sensor.getTelemetry();
    const fingerprint = ClientFingerprint.collect();

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 'v3',
        siteKey: this.siteKey,
        action,
        telemetry,
        fingerprint,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate v3 token: HTTP ${response.status}`);
    }

    const data = (await response.json()) as { token: string };
    return data.token;
  }

  public getSensor(): ClientSensor {
    return this.sensor;
  }
}
