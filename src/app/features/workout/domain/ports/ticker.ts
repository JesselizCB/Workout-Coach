export abstract class Ticker {
  abstract start(onTick: () => void): void;
  abstract stop(): void;
}
