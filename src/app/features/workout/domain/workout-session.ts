import { Exercise } from './exercise';
import { InvalidWorkoutError } from './workout.errors';

export type SessionStatus = 'idle' | 'running' | 'paused' | 'finished';
export type Phase = 'repetition' | 'rest';
export type ExerciseStatus = 'pending' | 'in-progress' | 'completed';
export type SessionEvent =
  | 'rest-started'
  | 'repetition-started'
  | 'exercise-completed'
  | 'workout-completed';

export interface WorkoutSession {
  readonly exercises: readonly Exercise[];
  readonly status: SessionStatus;
  readonly currentIndex: number;
  readonly phase: Phase;
  readonly remainingSeconds: number;
  readonly completedRepetitions: number;
  readonly lastEvent: SessionEvent | null;
}

const POSITIVE_INTEGER_FIELDS = ['repetitions', 'repetitionSeconds', 'restSeconds'] as const;

export function createSession(exercises: readonly Exercise[]): WorkoutSession {
  if (exercises.length === 0) {
    throw new InvalidWorkoutError('A workout needs at least one exercise.');
  }
  exercises.forEach(assertValidExercise);

  return {
    exercises,
    status: 'idle',
    currentIndex: 0,
    phase: 'repetition',
    remainingSeconds: exercises[0].repetitionSeconds,
    completedRepetitions: 0,
    lastEvent: null,
  };
}

function assertValidExercise(exercise: Exercise): void {
  for (const field of POSITIVE_INTEGER_FIELDS) {
    const value = exercise[field];
    if (!Number.isInteger(value) || value < 1) {
      throw new InvalidWorkoutError(
        `Exercise "${exercise.name}" has an invalid ${field}: ${value}.`,
      );
    }
  }
}
