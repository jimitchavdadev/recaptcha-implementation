import { describe, expect, test } from 'bun:test';
import { ChallengeManager } from '../src/server/challenge-mgr.js';

describe('ChallengeManager (v2 Visual Categorization)', () => {
  test('creates a valid 3x3 challenge with 9 items and expiration', () => {
    const challenge = ChallengeManager.createChallenge();

    expect(challenge.challengeId).toBeDefined();
    expect(challenge.items.length).toBe(9);
    expect(challenge.targetCategory).toBeDefined();
    expect(challenge.prompt).toContain(challenge.targetCategory.replace('_', ' '));
    expect(challenge.expiresAt).toBeGreaterThan(Date.now());

    // Ensure all items have valid inline SVG
    challenge.items.forEach((item) => {
      expect(item.id).toBeDefined();
      expect(item.svgPattern).toContain('<svg');
    });
  });

  test('validates correct selection successfully', () => {
    const challenge = ChallengeManager.createChallenge();
    // Access internal session for test verification
    const session = (ChallengeManager as any).sessions.get(challenge.challengeId);
    expect(session).toBeDefined();

    const correctIds = Array.from(session.correctItemIds) as string[];
    const passed = ChallengeManager.verifySolution(challenge.challengeId, correctIds);
    expect(passed).toBe(true);
  });

  test('rejects incorrect selections or incomplete selections', () => {
    const challenge = ChallengeManager.createChallenge();
    const session = (ChallengeManager as any).sessions.get(challenge.challengeId);
    const correctIds = Array.from(session.correctItemIds) as string[];

    // Missing one item
    const partialSelection = correctIds.slice(0, 1);
    const failedPartial = ChallengeManager.verifySolution(challenge.challengeId, partialSelection);
    expect(failedPartial).toBe(false);
  });

  test('prevents replay attack on solved challenge', () => {
    const challenge = ChallengeManager.createChallenge();
    const session = (ChallengeManager as any).sessions.get(challenge.challengeId);
    const correctIds = Array.from(session.correctItemIds) as string[];

    const firstAttempt = ChallengeManager.verifySolution(challenge.challengeId, correctIds);
    expect(firstAttempt).toBe(true);

    // Second attempt with same solution must fail
    const secondAttempt = ChallengeManager.verifySolution(challenge.challengeId, correctIds);
    expect(secondAttempt).toBe(false);
  });
});
