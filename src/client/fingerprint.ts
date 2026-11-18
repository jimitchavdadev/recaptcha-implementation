/**
 * Browser Environment Fingerprinting
 * Inspects execution context for automation markers, headless indicators, and GPU canvas hashes.
 */
import { CaptchaCrypto } from '../common/crypto.js';
import type { BrowserFingerprint } from '../common/types.js';

export class ClientFingerprint {
  public static collect(): BrowserFingerprint {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return this.fallbackFingerprint();
    }

    const isWebdriver = Boolean(
      navigator.webdriver ||
      (window as unknown as { __webdriver_evaluate?: unknown }).__webdriver_evaluate ||
      (window as unknown as { __selenium_evaluate?: unknown }).__selenium_evaluate ||
      (window as unknown as { __playwright?: unknown }).__playwright
    );

    const screenResolution: [number, number] = [
      window.screen ? window.screen.width : 0,
      window.screen ? window.screen.height : 0,
    ];

    const canvasHash = this.generateCanvasHash();
    const { webglVendor, webglRenderer } = this.getWebGLInfo();

    return {
      isWebdriver,
      userAgent: navigator.userAgent || 'unknown',
      language: navigator.language || 'en-US',
      languages: Array.isArray(navigator.languages) ? [...navigator.languages] : [],
      screenResolution,
      colorDepth: window.screen ? window.screen.colorDepth : 24,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
      canvasHash,
      webglVendor,
      webglRenderer,
      hasTouchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      timezoneOffset: new Date().getTimezoneOffset(),
    };
  }

  private static generateCanvasHash(): string {
    try {
      if (typeof document === 'undefined') return '0000000000000000';
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '0000000000000000';

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 5, 60, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('reCAPTCHA.v3', 2, 8);
      ctx.strokeStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(45, 20, 10, 0, Math.PI * 2, true);
      ctx.stroke();

      const dataUrl = canvas.toDataURL();
      return CaptchaCrypto.quickHash(dataUrl);
    } catch {
      return '0000000000000000';
    }
  }

  private static getWebGLInfo(): { webglVendor?: string; webglRenderer?: string } {
    try {
      if (typeof document === 'undefined') return {};
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl || !(gl instanceof WebGLRenderingContext)) return {};

      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (!dbg) return {};

      const vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      return { webglVendor: vendor, webglRenderer: renderer };
    } catch {
      return {};
    }
  }

  private static fallbackFingerprint(): BrowserFingerprint {
    return {
      isWebdriver: false,
      userAgent: 'Node/Bun-Environment',
      language: 'en-US',
      languages: ['en-US'],
      screenResolution: [1920, 1080],
      colorDepth: 24,
      hardwareConcurrency: 8,
      canvasHash: 'fallback_canvas_hash',
      hasTouchSupport: false,
      timezoneOffset: 0,
    };
  }
}
