import { Injectable } from '@angular/core';
import { Ticker } from '../domain/ports/ticker';

const ONE_SECOND_MS = 1000;

@Injectable()
export class IntervalTicker implements Ticker {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(onTick: () => void): void {
    this.stop();
    this.intervalId = setInterval(onTick, ONE_SECOND_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
