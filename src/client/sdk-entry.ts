/**
 * reCAPTCHA Browser Client SDK Entry
 * Exposes Google reCAPTCHA-compatible window.customCaptcha API for both v2 and v3.
 */
import { ReCaptchaV2Widget, type V2WidgetOptions } from './v2-widget.js';
import { ReCaptchaV3Engine } from './v3-engine.js';

export interface CustomCaptchaGlobal {
  v3Engines: Map<string, ReCaptchaV3Engine>;
  v2Widgets: Map<string, ReCaptchaV2Widget>;
  ready: (cb: () => void) => void;
  render: (containerId: string, options: Omit<V2WidgetOptions, 'containerId'>) => ReCaptchaV2Widget;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

const v3Engines = new Map<string, ReCaptchaV3Engine>();
const v2Widgets = new Map<string, ReCaptchaV2Widget>();
const readyCallbacks: (() => void)[] = [];
let isReady = false;

export const customCaptcha: CustomCaptchaGlobal = {
  v3Engines,
  v2Widgets,

  ready(callback: () => void) {
    if (isReady) {
      callback();
    } else {
      readyCallbacks.push(callback);
    }
  },

  render(containerId: string, options: Omit<V2WidgetOptions, 'containerId'>) {
    const widget = new ReCaptchaV2Widget({ ...options, containerId });
    v2Widgets.set(containerId, widget);
    return widget;
  },

  async execute(siteKey: string, options: { action: string }): Promise<string> {
    let engine = v3Engines.get(siteKey);
    if (!engine) {
      engine = new ReCaptchaV3Engine({ siteKey });
      v3Engines.set(siteKey, engine);
    }
    return engine.execute(options.action);
  },
};

// Auto-register in global window scope when loaded in browser
if (typeof window !== 'undefined') {
  (window as unknown as { customCaptcha: CustomCaptchaGlobal }).customCaptcha = customCaptcha;
  setTimeout(() => {
    isReady = true;
    readyCallbacks.forEach((cb) => {
      try {
        cb();
      } catch {
        // Safe callback handling
      }
    });
  }, 0);
}
