/**
 * Custom Human Verification Widget
 * Generic checkbox verification UI and visual category challenge modal.
 */
import type { VisualChallenge } from '../common/types.js';
import { ClientFingerprint } from './fingerprint.js';
import { ClientSensor } from './sensor.js';

export interface V2WidgetOptions {
  siteKey: string;
  containerId: string;
  onVerify?: (token: string) => void;
  apiEndpoint?: string;
}

export class ReCaptchaV2Widget {
  private opts: V2WidgetOptions;
  private sensor: ClientSensor;
  private container: HTMLElement | null = null;
  private verifiedToken: string | null = null;

  constructor(options: V2WidgetOptions) {
    this.opts = { apiEndpoint: '/api/token', ...options };
    this.sensor = new ClientSensor();
    this.sensor.start();
    this.render();
  }

  private render(): void {
    if (typeof document === 'undefined') return;
    this.container = document.getElementById(this.opts.containerId);
    if (!this.container) return;

    this.container.innerHTML = `
      <div style="border: 1px solid #cbd5e1; background: #ffffff; width: 300px; height: 74px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; font-family: sans-serif; box-sizing: border-box; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div id="check-box-${this.opts.containerId}" style="width: 24px; height: 24px; border: 2px solid #94a3b8; border-radius: 4px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
          </div>
          <span style="font-size: 14px; font-weight: 500; color: #1e293b;">I am a human</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #64748b;">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563eb" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style="font-size: 9px; font-weight: 600; color: #2563eb; margin-top: 2px;">BotShield</span>
        </div>
      </div>
      <div id="modal-anchor-${this.opts.containerId}"></div>
    `;

    const box = document.getElementById(`check-box-${this.opts.containerId}`);
    box?.addEventListener('click', () => this.handleBoxClick());
  }

  private async handleBoxClick(): Promise<void> {
    if (this.verifiedToken) return;
    const box = document.getElementById(`check-box-${this.opts.containerId}`);
    if (box) {
      box.innerHTML = `<div style="width: 14px; height: 14px; border: 2px solid #2563eb; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>`;
    }

    const telemetry = this.sensor.getTelemetry();
    const fingerprint = ClientFingerprint.collect();

    const res = await fetch(this.opts.apiEndpoint || '/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 'v2', siteKey: this.opts.siteKey, telemetry, fingerprint }),
    });

    const data = await res.json();
    if (data.status === 'passed' && data.token) {
      this.markSolved(data.token);
    } else if (data.status === 'challenge_required') {
      this.showChallengeModal(data.challenge);
    }
  }

  private markSolved(token: string): void {
    this.verifiedToken = token;
    const box = document.getElementById(`check-box-${this.opts.containerId}`);
    if (box) {
      box.style.borderColor = '#16a34a';
      box.style.backgroundColor = '#dcfce7';
      box.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
    if (this.opts.onVerify) this.opts.onVerify(token);
  }

  private showChallengeModal(ch: VisualChallenge): void {
    const modalAnchor = document.getElementById(`modal-anchor-${this.opts.containerId}`);
    if (!modalAnchor) return;
    const selected = new Set<string>();

    modalAnchor.innerHTML = `
      <div style="margin-top: 10px; width: 300px; border: 1px solid #cbd5e1; background: #fff; box-shadow: 0 8px 20px rgba(0,0,0,0.1); border-radius: 6px; padding: 12px; box-sizing: border-box;">
        <div style="background: #2563eb; color: #fff; padding: 10px; border-radius: 4px; font-weight: 600; font-size: 13px;">${ch.prompt}</div>
        <div id="grid-${ch.challengeId}" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 10px 0;">
          ${ch.items.map((it) => `<div class="cell-opt" data-id="${it.id}" style="border: 2px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 72px; background: #f8fafc; border-radius: 4px;">${it.svgPattern}</div>`).join('')}
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button id="verify-btn-${ch.challengeId}" style="background: #2563eb; color: #fff; border: none; padding: 7px 14px; border-radius: 4px; font-weight: 600; font-size: 12px; cursor: pointer;">Verify</button>
        </div>
      </div>
    `;

    const cells = modalAnchor.querySelectorAll('.cell-opt');
    cells.forEach((cell) => {
      cell.addEventListener('click', () => {
        const id = cell.getAttribute('data-id')!;
        if (selected.has(id)) {
          selected.delete(id);
          (cell as HTMLElement).style.borderColor = 'transparent';
        } else {
          selected.add(id);
          (cell as HTMLElement).style.borderColor = '#2563eb';
        }
      });
    });

    document.getElementById(`verify-btn-${ch.challengeId}`)?.addEventListener('click', async () => {
      const resp = await fetch('/api/challenge/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: ch.challengeId, selectedIds: [...selected] }),
      });
      const resData = await resp.json();
      if (resData.success && resData.token) {
        modalAnchor.innerHTML = '';
        this.markSolved(resData.token);
      } else {
        alert('Challenge failed. Please try again.');
      }
    });
  }
}
