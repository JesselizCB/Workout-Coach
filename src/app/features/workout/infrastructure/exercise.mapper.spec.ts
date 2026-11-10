import { ExerciseDto } from './exercise.dto';
import { toExercise } from './exercise.mapper';

describe('toExercise', () => {
  it('translates every snake_case field to the domain model', () => {
    const dto: ExerciseDto = {
      exercise_name: 'Squats',
      repetitions_number: 3,
      repetition_time: 5,
      rest_time: 3,
    };

    expect(toExercise(dto)).toEqual({
      name: 'Squats',
      repetitions: 3,
      repetitionSeconds: 5,
      restSeconds: 3,
    });
  });
});
