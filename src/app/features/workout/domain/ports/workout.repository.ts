import { Exercise } from '../exercise';

/**
 * Source of the exercises for a workout.
 * An abstract class instead of an interface so it can be used as a dependency
 * injection token without importing Angular into the domain.
 */
export abstract class WorkoutRepository {
  abstract getExercises(): Promise<readonly Exercise[]>;
}
