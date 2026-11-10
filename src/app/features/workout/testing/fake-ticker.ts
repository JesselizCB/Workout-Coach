import { Ticker } from '../domain/ports/ticker';

/** Test double for the clock: time only advances when a test calls tick(). */
export class FakeTicker implements Ticker {
  startCalls = 0;
  private onTick: (() => void) | null = null;

  get running(): boolean {
    return this.onTick !== null;
  }

  start(onTick: () => void): void {
    this.startCalls++;
    this.onTick = onTick;
  }

  stop(): void {
    this.onTick = null;
  }

  tick(times = 1): void {
    for (let i = 0; i < times; i++) {
      this.onTick?.();
    }
  }
}
