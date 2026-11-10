import { Exercise } from '../domain/exercise';
import { ExerciseDto } from './exercise.dto';

export function toExercise(dto: ExerciseDto): Exercise {
  return {
    name: dto.exercise_name,
    repetitions: dto.repetitions_number,
    repetitionSeconds: dto.repetition_time,
    restSeconds: dto.rest_time,
  };
}
