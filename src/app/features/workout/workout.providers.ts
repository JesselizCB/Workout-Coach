import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { Ticker } from './domain/ports/ticker';
import { WorkoutRepository } from './domain/ports/workout.repository';
import { IntervalTicker } from './infrastructure/interval-ticker';
import { MockWorkoutRepository } from './infrastructure/mock-workout.repository';

/**
 * Composition root of the workout feature: the only place that knows which
 * implementation backs each domain port.
 */
export function provideWorkout(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: WorkoutRepository, useClass: MockWorkoutRepository },
    { provide: Ticker, useClass: IntervalTicker },
  ]);
}
