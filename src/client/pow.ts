/**
 * Client-Side Proof of Work (PoW) Solver
 * Computes hash preimage under elevated risk conditions to throttle automated scrapers.
 */
import { CaptchaCrypto } from '../common/crypto.js';

export interface PowChallenge {
  nonce: string;
  difficulty: number; // e.g., 3 means hash must start with '000'
}

export class PowSolver {
  /**
   * Solves proof-of-work challenge by finding counter yielding required leading zeros
   */
  public static solve(challenge: PowChallenge): { answer: number; durationMs: number } {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prefix = '0'.repeat(challenge.difficulty);
    let counter = 0;

    while (true) {
      const candidate = `${challenge.nonce}:${counter}`;
      const hash = CaptchaCrypto.quickHash(candidate);
      if (hash.startsWith(prefix)) {
        const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
        return { answer: counter, durationMs: Math.round(end - start) };
      }
      counter++;
      // Circuit breaker to avoid locking thread in unexpected scenarios
      if (counter > 1_000_000) {
        return { answer: -1, durationMs: 0 };
      }
    }
  }

  /**
   * Fast verification on server side
   */
  public static verify(nonce: string, difficulty: number, answer: number): boolean {
    if (answer < 0) return false;
    const prefix = '0'.repeat(difficulty);
    const candidate = `${nonce}:${answer}`;
    const hash = CaptchaCrypto.quickHash(candidate);
    return hash.startsWith(prefix);
  }
}
