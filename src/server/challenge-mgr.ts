/**
 * v2 Interactive Challenge Manager
 * Generates and validates visual categorization challenges (3x3 grid) for suspicious traffic.
 */
import { RECAPTCHA_CONSTANTS } from '../common/constants.js';
import { CaptchaCrypto } from '../common/crypto.js';
import type { ChallengeItem, VisualChallenge } from '../common/types.js';

interface ChallengeSession {
  challengeId: string;
  targetCategory: string;
  correctItemIds: Set<string>;
  expiresAt: number;
}

const CATEGORY_SVGS: Record<string, string> = {
  car: `<svg viewBox="0 0 64 64" width="60" height="60"><rect x="8" y="24" width="48" height="20" rx="4" fill="#3b82f6"/><polygon points="14,24 22,12 42,12 50,24" fill="#60a5fa"/><circle cx="18" cy="46" r="6" fill="#1e293b"/><circle cx="46" cy="46" r="6" fill="#1e293b"/></svg>`,
  traffic_light: `<svg viewBox="0 0 64 64" width="60" height="60"><rect x="22" y="6" width="20" height="48" rx="4" fill="#1e293b"/><circle cx="32" cy="16" r="5" fill="#ef4444"/><circle cx="32" cy="30" r="5" fill="#eab308"/><circle cx="32" cy="44" r="5" fill="#22c55e"/></svg>`,
  bicycle: `<svg viewBox="0 0 64 64" width="60" height="60"><circle cx="16" cy="42" r="12" fill="none" stroke="#0ea5e9" stroke-width="4"/><circle cx="48" cy="42" r="12" fill="none" stroke="#0ea5e9" stroke-width="4"/><polyline points="16,42 32,42 40,24 24,24 32,42" fill="none" stroke="#0f172a" stroke-width="3"/><circle cx="24" cy="20" r="3" fill="#0f172a"/></svg>`,
  hydrant: `<svg viewBox="0 0 64 64" width="60" height="60"><rect x="24" y="16" width="16" height="36" fill="#dc2626"/><ellipse cx="32" cy="16" rx="8" ry="4" fill="#b91c1c"/><rect x="18" y="26" width="6" height="6" fill="#991b1b"/><rect x="40" y="26" width="6" height="6" fill="#991b1b"/><rect x="20" y="52" width="24" height="6" fill="#7f1d1d"/></svg>`,
};

export class ChallengeManager {
  private static sessions = new Map<string, ChallengeSession>();

  /**
   * Creates a randomized 3x3 challenge session
   */
  public static createChallenge(): VisualChallenge {
    this.cleanExpired();
    const categories = Object.keys(CATEGORY_SVGS);
    const targetIdx = Math.floor(Math.random() * categories.length);
    const targetCategory = categories[targetIdx];

    const challengeId = CaptchaCrypto.generateNonce(12);
    const correctIds = new Set<string>();
    const items: { id: string; svgPattern: string }[] = [];

    // Ensure 3 to 4 target items in a 9-item grid
    const totalSlots = 9;
    const targetCount = 3 + Math.floor(Math.random() * 2);
    const slotTypes: string[] = [];

    for (let i = 0; i < targetCount; i++) slotTypes.push(targetCategory);
    while (slotTypes.length < totalSlots) {
      const other = categories.filter((c) => c !== targetCategory);
      slotTypes.push(other[Math.floor(Math.random() * other.length)]);
    }

    // Shuffle slots
    for (let i = slotTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slotTypes[i], slotTypes[j]] = [slotTypes[j], slotTypes[i]];
    }

    slotTypes.forEach((cat, index) => {
      const itemId = `cell_${index}_${CaptchaCrypto.generateNonce(4)}`;
      if (cat === targetCategory) correctIds.add(itemId);
      items.push({ id: itemId, svgPattern: CATEGORY_SVGS[cat] });
    });

    const expiresAt = Date.now() + RECAPTCHA_CONSTANTS.CHALLENGE_TTL_MS;
    this.sessions.set(challengeId, {
      challengeId,
      targetCategory,
      correctItemIds: correctIds,
      expiresAt,
    });

    const humanPrompt = `Select all squares with a ${targetCategory.replace('_', ' ')}`;
    return { challengeId, prompt: humanPrompt, targetCategory, items, expiresAt };
  }

  /**
   * Verifies the submitted selections for a challenge
   */
  public static verifySolution(challengeId: string, selectedIds: string[]): boolean {
    this.cleanExpired();
    const session = this.sessions.get(challengeId);
    if (!session || Date.now() > session.expiresAt) {
      return false;
    }

    // Must match all target items and have no extraneous false positives
    const userSet = new Set(selectedIds);
    if (userSet.size !== session.correctItemIds.size) {
      this.sessions.delete(challengeId);
      return false;
    }

    for (const id of session.correctItemIds) {
      if (!userSet.has(id)) {
        this.sessions.delete(challengeId);
        return false;
      }
    }

    // Solved successfully: consume challenge session to prevent replay
    this.sessions.delete(challengeId);
    return true;
  }

  private static cleanExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
      }
    }
  }
}
