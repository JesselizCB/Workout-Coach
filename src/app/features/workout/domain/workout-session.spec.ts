import { Exercise } from './exercise';
import { InvalidWorkoutError } from './workout.errors';
import { createSession } from './workout-session';

const squats: Exercise = { name: 'Squats', repetitions: 3, repetitionSeconds: 5, restSeconds: 3 };
const pushUps: Exercise = { name: 'Push-ups', repetitions: 2, repetitionSeconds: 4, restSeconds: 2 };

describe('createSession', () => {
  it('CA1: creates an idle session that does not start on its own', () => {
    const session = createSession([squats, pushUps]);

    expect(session).toEqual({
      exercises: [squats, pushUps],
      status: 'idle',
      currentIndex: 0,
      phase: 'repetition',
      remainingSeconds: 5,
      completedRepetitions: 0,
      lastEvent: null,
    });
  });

  it('CA15: rejects an empty exercise list', () => {
    expect(() => createSession([])).toThrowError(InvalidWorkoutError);
  });

  it('CA15: rejects an invalid exercise even when it is not the first one', () => {
    const invalid: Exercise = { ...pushUps, repetitions: 0 };

    expect(() => createSession([squats, invalid])).toThrowError(InvalidWorkoutError);
  });

  const numericFields = ['repetitions', 'repetitionSeconds', 'restSeconds'] as const;
  const invalidValues = [0, -1, 1.5, Number.NaN];

  for (const field of numericFields) {
    for (const value of invalidValues) {
      it(`CA15: rejects ${field} = ${value}`, () => {
        const invalid: Exercise = { ...squats, [field]: value };

        expect(() => createSession([invalid])).toThrowError(InvalidWorkoutError);
      });
    }
  }
});
