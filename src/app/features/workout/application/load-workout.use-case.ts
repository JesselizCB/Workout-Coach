import { inject, Injectable } from '@angular/core';
import { WorkoutRepository } from '../domain/ports/workout.repository';
import { createSession, WorkoutSession } from '../domain/workout-session';

@Injectable({ providedIn: 'root' })
export class LoadWorkoutUseCase {
  private readonly repository = inject(WorkoutRepository);

  async execute(): Promise<WorkoutSession> {
    const exercises = await this.repository.getExercises();
    return createSession(exercises);
  }
}
