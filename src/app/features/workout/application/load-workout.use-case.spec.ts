import { TestBed } from '@angular/core/testing';
import { Exercise } from '../domain/exercise';
import { WorkoutRepository } from '../domain/ports/workout.repository';
import { InvalidWorkoutError } from '../domain/workout.errors';
import { createSession } from '../domain/workout-session';
import { LoadWorkoutUseCase } from './load-workout.use-case';

const squats: Exercise = { name: 'Squats', repetitions: 3, repetitionSeconds: 5, restSeconds: 3 };

function setUp(getExercises: () => Promise<readonly Exercise[]>): LoadWorkoutUseCase {
  const repository: WorkoutRepository = { getExercises };
  TestBed.configureTestingModule({
    providers: [{ provide: WorkoutRepository, useValue: repository }],
  });
  return TestBed.inject(LoadWorkoutUseCase);
}

describe('LoadWorkoutUseCase', () => {
  it('CA1: creates an idle session from the repository exercises', async () => {
    const useCase = setUp(() => Promise.resolve([squats]));

    expect(await useCase.execute()).toEqual(createSession([squats]));
  });

  it('CA15: rejects when the repository returns no exercises', async () => {
    const useCase = setUp(() => Promise.resolve([]));

    await expectAsync(useCase.execute()).toBeRejectedWithError(InvalidWorkoutError);
  });

  it('CA16: passes on the error when loading fails', async () => {
    const failure = new Error('Network down');
    const useCase = setUp(() => Promise.reject(failure));

    await expectAsync(useCase.execute()).toBeRejectedWith(failure);
  });
});
