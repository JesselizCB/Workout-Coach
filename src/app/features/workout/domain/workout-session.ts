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

export function start(session: WorkoutSession): WorkoutSession {
  if (session.status !== 'idle' && session.status !== 'paused') {
    return session;
  }
  return { ...session, status: 'running' };
}

export function pause(session: WorkoutSession): WorkoutSession {
  if (session.status !== 'running') {
    return session;
  }
  return { ...session, status: 'paused' };
}

export function reset(session: WorkoutSession): WorkoutSession {
  return createSession(session.exercises);
}

export function tick(session: WorkoutSession): WorkoutSession {
  if (session.status !== 'running') {
    return session;
  }
  if (session.remainingSeconds > 1) {
    return { ...session, remainingSeconds: session.remainingSeconds - 1 };
  }
  return session.phase === 'repetition' ? startRest(session) : finishRest(session);
}

export function getExerciseStatuses(session: WorkoutSession): readonly ExerciseStatus[] {
  return session.exercises.map((_, index) => exerciseStatusAt(session, index));
}

function exerciseStatusAt(session: WorkoutSession, index: number): ExerciseStatus {
  if (session.status === 'idle') {
    return 'pending';
  }
  if (session.status === 'finished' || index < session.currentIndex) {
    return 'completed';
  }
  return index === session.currentIndex ? 'in-progress' : 'pending';
}

function startRest(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    phase: 'rest',
    remainingSeconds: currentExercise(session).restSeconds,
    lastEvent: 'rest-started',
  };
}

function finishRest(session: WorkoutSession): WorkoutSession {
  const exercise = currentExercise(session);
  const completedRepetitions = session.completedRepetitions + 1;

  if (completedRepetitions < exercise.repetitions) {
    return {
      ...session,
      phase: 'repetition',
      remainingSeconds: exercise.repetitionSeconds,
      completedRepetitions,
      lastEvent: 'repetition-started',
    };
  }

  const nextIndex = session.currentIndex + 1;
  if (nextIndex < session.exercises.length) {
    return {
      ...session,
      currentIndex: nextIndex,
      phase: 'repetition',
      remainingSeconds: session.exercises[nextIndex].repetitionSeconds,
      completedRepetitions: 0,
      lastEvent: 'exercise-completed',
    };
  }

  return {
    ...session,
    status: 'finished',
    remainingSeconds: 0,
    completedRepetitions,
    lastEvent: 'workout-completed',
  };
}

function currentExercise(session: WorkoutSession): Exercise {
  return session.exercises[session.currentIndex];
}

function assertValidExercise(exercise: Exercise): void {
  if (exercise.name.trim() === '') {
    throw new InvalidWorkoutError('Every exercise needs a name.');
  }
  for (const field of POSITIVE_INTEGER_FIELDS) {
    const value = exercise[field];
    if (!Number.isInteger(value) || value < 1) {
      throw new InvalidWorkoutError(
        `Exercise "${exercise.name}" has an invalid ${field}: ${value}.`,
      );
    }
  }
}
