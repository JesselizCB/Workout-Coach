import { IntervalTicker } from './interval-ticker';

describe('IntervalTicker', () => {
  let ticker: IntervalTicker;
  let onTick: jasmine.Spy;

  beforeEach(() => {
    jasmine.clock().install();
    ticker = new IntervalTicker();
    onTick = jasmine.createSpy('onTick');
  });

  afterEach(() => {
    ticker.stop();
    jasmine.clock().uninstall();
  });

  it('calls back once per second while started', () => {
    ticker.start(onTick);

    jasmine.clock().tick(999);
    expect(onTick).not.toHaveBeenCalled();

    jasmine.clock().tick(1);
    expect(onTick).toHaveBeenCalledTimes(1);

    jasmine.clock().tick(2000);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('stops calling back after stop', () => {
    ticker.start(onTick);
    jasmine.clock().tick(1000);

    ticker.stop();
    jasmine.clock().tick(3000);

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('CA13: never runs two intervals at the same time', () => {
    const firstCallback = jasmine.createSpy('firstCallback');

    ticker.start(firstCallback);
    ticker.start(onTick);
    jasmine.clock().tick(1000);

    expect(firstCallback).not.toHaveBeenCalled();
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('can be stopped without having been started', () => {
    expect(() => ticker.stop()).not.toThrow();
  });
});
