import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Ticker } from '../domain/ports/ticker';
import {
  ExerciseStatus,
  getExerciseStatuses,
  pause as pauseSession,
  reset as resetSession,
  start as startSession,
  tick as tickSession,
  WorkoutSession,
} from '../domain/workout-session';
import { LoadWorkoutUseCase } from './load-workout.use-case';

export type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * Holds the workout session in signals and connects the domain with the clock.
 * Provided by the page container, so it lives and dies with the screen.
 */
@Injectable()
export class WorkoutSessionStore {
  private readonly loadWorkout = inject(LoadWorkoutUseCase);
  private readonly ticker = inject(Ticker);

  private readonly loadStatusState = signal<LoadStatus>('loading');
  private readonly sessionState = signal<WorkoutSession | null>(null);

  readonly loadStatus = this.loadStatusState.asReadonly();
  readonly session = this.sessionState.asReadonly();
  readonly exerciseStatuses = computed<readonly ExerciseStatus[]>(() => {
    const session = this.session();
    return session ? getExerciseStatuses(session) : [];
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.ticker.stop());
  }

  async load(): Promise<void> {
    this.ticker.stop();
    this.sessionState.set(null);
    this.loadStatusState.set('loading');
    try {
      this.sessionState.set(await this.loadWorkout.execute());
      this.loadStatusState.set('ready');
    } catch {
      this.sessionState.set(null);
      this.loadStatusState.set('error');
    }
  }

  start(): void {
    const current = this.session();
    if (!current) {
      return;
    }
    const next = startSession(current);
    if (next === current) {
      return;
    }
    this.sessionState.set(next);
    this.ticker.start(() => this.onTick());
  }

  pause(): void {
    this.ticker.stop();
    this.updateSession(pauseSession);
  }

  reset(): void {
    this.ticker.stop();
    this.updateSession(resetSession);
  }

  private onTick(): void {
    this.updateSession(tickSession);
    if (this.session()?.status !== 'running') {
      this.ticker.stop();
    }
  }

  private updateSession(transition: (session: WorkoutSession) => WorkoutSession): void {
    this.sessionState.update((session) => (session ? transition(session) : session));
  }
}
