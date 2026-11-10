import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Exercise } from '../domain/exercise';
import { Ticker } from '../domain/ports/ticker';
import { WorkoutRepository } from '../domain/ports/workout.repository';
import { createSession } from '../domain/workout-session';
import { WorkoutSessionStore } from './workout-session.store';

class FakeTicker implements Ticker {
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

const squats: Exercise = { name: 'Squats', repetitions: 3, repetitionSeconds: 5, restSeconds: 3 };
const pushUps: Exercise = { name: 'Push-ups', repetitions: 2, repetitionSeconds: 4, restSeconds: 2 };

describe('WorkoutSessionStore', () => {
  let ticker: FakeTicker;

  function setUp(getExercises: () => Promise<readonly Exercise[]>): WorkoutSessionStore {
    ticker = new FakeTicker();
    const repository: WorkoutRepository = { getExercises };
    TestBed.configureTestingModule({
      providers: [
        WorkoutSessionStore,
        { provide: Ticker, useValue: ticker },
        { provide: WorkoutRepository, useValue: repository },
      ],
    });
    return TestBed.inject(WorkoutSessionStore);
  }

  async function loadedStore(exercises: readonly Exercise[] = [squats, pushUps]): Promise<WorkoutSessionStore> {
    const store = setUp(() => Promise.resolve(exercises));
    await store.load();
    return store;
  }

  describe('loading', () => {
    it('is loading and has no session before the exercises arrive', () => {
      const store = setUp(() => Promise.resolve([squats]));

      expect(store.loadStatus()).toBe('loading');
      expect(store.session()).toBeNull();
    });

    it('CA1: ends ready with every exercise pending and the clock stopped', async () => {
      const store = await loadedStore();

      expect(store.loadStatus()).toBe('ready');
      expect(store.session()).toEqual(createSession([squats, pushUps]));
      expect(store.exerciseStatuses()).toEqual(['pending', 'pending']);
      expect(ticker.running).toBeFalse();
    });

    it('CA15: ends in error without a session when the exercises are invalid', async () => {
      const store = await loadedStore([]);

      expect(store.loadStatus()).toBe('error');
      expect(store.session()).toBeNull();
    });

    it('stops the clock when the workout is loaded again', async () => {
      const store = await loadedStore();
      store.start();

      await store.load();

      expect(ticker.running).toBeFalse();
      expect(store.session()).toEqual(createSession([squats, pushUps]));
    });

    it('has no session while reloading, so starting has no effect', async () => {
      const store = await loadedStore();

      const reload = store.load();
      store.start();

      expect(store.loadStatus()).toBe('loading');
      expect(store.session()).toBeNull();
      expect(ticker.startCalls).toBe(0);

      await reload;

      expect(store.session()).toEqual(createSession([squats, pushUps]));
    });

    it('CA16: ends in error without a session when loading fails', async () => {
      const store = setUp(() => Promise.reject(new Error('Network down')));

      await store.load();

      expect(store.loadStatus()).toBe('error');
      expect(store.session()).toBeNull();
    });
  });

  describe('controls', () => {
    it('CA2: starting runs the first exercise and starts the clock', async () => {
      const store = await loadedStore();

      store.start();

      expect(store.session()?.status).toBe('running');
      expect(store.exerciseStatuses()).toEqual(['in-progress', 'pending']);
      expect(ticker.running).toBeTrue();
    });

    it('applies one domain tick per clock tick', async () => {
      const store = await loadedStore();
      store.start();

      ticker.tick(2);

      expect(store.session()?.remainingSeconds).toBe(squats.repetitionSeconds - 2);
    });

    it('CA7: pausing stops the clock and resuming continues from the same point', async () => {
      const store = await loadedStore();
      store.start();
      ticker.tick(2);

      store.pause();

      expect(store.session()?.status).toBe('paused');
      expect(ticker.running).toBeFalse();

      store.start();
      ticker.tick();

      expect(store.session()?.remainingSeconds).toBe(squats.repetitionSeconds - 3);
    });

    it('CA8: resetting stops the clock and returns to the initial state', async () => {
      const store = await loadedStore();
      store.start();
      ticker.tick(7);

      store.reset();

      expect(ticker.running).toBeFalse();
      expect(store.session()).toEqual(createSession([squats, pushUps]));
    });

    it('CA13: starting twice does not start a second clock', async () => {
      const store = await loadedStore();

      store.start();
      store.start();

      expect(ticker.startCalls).toBe(1);
    });

    it('CA9: stops the clock when the workout finishes and ignores a later start', async () => {
      const shortWorkout: Exercise = { name: 'Squats', repetitions: 1, repetitionSeconds: 1, restSeconds: 1 };
      const store = await loadedStore([shortWorkout]);
      store.start();

      ticker.tick(2);

      expect(store.session()?.status).toBe('finished');
      expect(ticker.running).toBeFalse();

      store.start();

      expect(ticker.startCalls).toBe(1);
      expect(store.session()?.status).toBe('finished');
    });

    it('ignores the controls while there is no session', () => {
      const store = setUp(() => Promise.resolve([squats]));

      store.start();
      store.pause();
      store.reset();

      expect(store.session()).toBeNull();
      expect(ticker.startCalls).toBe(0);
    });
  });

  it('CA14: stops the clock when the store is destroyed', async () => {
    setUp(() => Promise.resolve([squats]));
    const injector = createEnvironmentInjector([WorkoutSessionStore], TestBed.inject(EnvironmentInjector));
    const store = injector.get(WorkoutSessionStore);
    await store.load();
    store.start();

    injector.destroy();

    expect(ticker.running).toBeFalse();
  });
});
