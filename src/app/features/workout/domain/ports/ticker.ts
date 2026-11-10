/**
 * Clock that calls back once per second while started.
 * Keeping it behind a port lets tests advance time manually.
 */
export abstract class Ticker {
  abstract start(onTick: () => void): void;
  abstract stop(): void;
}
