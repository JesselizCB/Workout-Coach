import { Exercise } from '../exercise';

export abstract class WorkoutRepository {
  abstract getExercises(): Promise<readonly Exercise[]>;
}
