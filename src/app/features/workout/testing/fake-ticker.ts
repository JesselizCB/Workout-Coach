import { Ticker } from '../domain/ports/ticker';

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
