import { Injectable } from '@angular/core';
import { Exercise } from '../domain/exercise';
import { WorkoutRepository } from '../domain/ports/workout.repository';
import { ExerciseDto } from './exercise.dto';
import { toExercise } from './exercise.mapper';

const MOCK_EXERCISES: readonly ExerciseDto[] = [
  { exercise_name: 'Squats', repetitions_number: 3, repetition_time: 5, rest_time: 3 },
  { exercise_name: 'Push-ups', repetitions_number: 2, repetition_time: 4, rest_time: 2 },
  { exercise_name: 'Plank', repetitions_number: 2, repetition_time: 6, rest_time: 3 },
];

@Injectable()
export class MockWorkoutRepository implements WorkoutRepository {
  getExercises(): Promise<readonly Exercise[]> {
    return Promise.resolve(MOCK_EXERCISES.map(toExercise));
  }
}
