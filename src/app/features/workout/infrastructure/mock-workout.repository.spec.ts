import { createSession } from '../domain/workout-session';
import { MockWorkoutRepository } from './mock-workout.repository';

describe('MockWorkoutRepository', () => {
  it('returns a list with more than one exercise', async () => {
    const exercises = await new MockWorkoutRepository().getExercises();

    expect(exercises.length).toBeGreaterThan(1);
  });

  it('returns exercises that form a valid session', async () => {
    const exercises = await new MockWorkoutRepository().getExercises();

    expect(() => createSession(exercises)).not.toThrow();
  });

  it('keeps the original legacy exercise first', async () => {
    const [first] = await new MockWorkoutRepository().getExercises();

    expect(first).toEqual({ name: 'Squats', repetitions: 3, repetitionSeconds: 5, restSeconds: 3 });
  });
});
