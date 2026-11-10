import { Exercise } from './exercise';
import { InvalidWorkoutError } from './workout.errors';
import { createSession, pause, reset, start, WorkoutSession } from './workout-session';

const squats: Exercise = { name: 'Squats', repetitions: 3, repetitionSeconds: 5, restSeconds: 3 };
const pushUps: Exercise = { name: 'Push-ups', repetitions: 2, repetitionSeconds: 4, restSeconds: 2 };

function sessionWith(overrides: Partial<WorkoutSession>): WorkoutSession {
  return { ...createSession([squats, pushUps]), ...overrides };
}

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

describe('start', () => {
  it('CA2: activates the first exercise with its repetition time', () => {
    const session = start(createSession([squats, pushUps]));

    expect(session.status).toBe('running');
    expect(session.currentIndex).toBe(0);
    expect(session.phase).toBe('repetition');
    expect(session.remainingSeconds).toBe(squats.repetitionSeconds);
  });

  it('CA7: resumes a paused session from the same point', () => {
    const paused = sessionWith({ status: 'paused', phase: 'rest', remainingSeconds: 2, completedRepetitions: 1 });

    expect(start(paused)).toEqual({ ...paused, status: 'running' });
  });

  it('does not modify the session it receives', () => {
    const idle = createSession([squats, pushUps]);

    start(idle);

    expect(idle.status).toBe('idle');
  });

  it('CA9: has no effect on a finished session', () => {
    const finished = sessionWith({ status: 'finished', remainingSeconds: 0 });

    expect(start(finished)).toBe(finished);
  });

  it('has no effect on a running session', () => {
    const running = sessionWith({ status: 'running' });

    expect(start(running)).toBe(running);
  });
});

describe('pause', () => {
  it('CA7: keeps the progress of a running session', () => {
    const running = sessionWith({ status: 'running', currentIndex: 1, remainingSeconds: 3, completedRepetitions: 1 });

    expect(pause(running)).toEqual({ ...running, status: 'paused' });
  });

  for (const status of ['idle', 'paused', 'finished'] as const) {
    it(`has no effect on a ${status} session`, () => {
      const session = sessionWith({ status });

      expect(pause(session)).toBe(session);
    });
  }
});

describe('reset', () => {
  const progressed = {
    currentIndex: 1,
    phase: 'rest',
    remainingSeconds: 1,
    completedRepetitions: 1,
    lastEvent: 'rest-started',
  } as const;

  for (const status of ['idle', 'running', 'paused', 'finished'] as const) {
    it(`CA8: returns a ${status} session to its initial state`, () => {
      const session = sessionWith({ ...progressed, status });

      expect(reset(session)).toEqual(createSession([squats, pushUps]));
    });
  }
});
