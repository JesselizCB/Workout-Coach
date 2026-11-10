import { Exercise } from './exercise';
import { InvalidWorkoutError } from './workout.errors';
import { createSession, pause, reset, start, tick, WorkoutSession } from './workout-session';

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

describe('tick', () => {
  it('counts down one second during a repetition', () => {
    const session = sessionWith({ status: 'running', remainingSeconds: 4, lastEvent: 'repetition-started' });

    expect(tick(session)).toEqual({ ...session, remainingSeconds: 3 });
  });

  it('counts down one second during a rest', () => {
    const session = sessionWith({ status: 'running', phase: 'rest', remainingSeconds: 2, lastEvent: 'rest-started' });

    expect(tick(session)).toEqual({ ...session, remainingSeconds: 1 });
  });

  it('CA3: starts the rest with its rest time when the repetition reaches zero', () => {
    const session = sessionWith({ status: 'running', remainingSeconds: 1 });

    expect(tick(session)).toEqual({
      ...session,
      phase: 'rest',
      remainingSeconds: squats.restSeconds,
      lastEvent: 'rest-started',
    });
  });

  it('CA4: adds a completed repetition when the rest ends', () => {
    const session = sessionWith({ status: 'running', phase: 'rest', remainingSeconds: 1 });

    expect(tick(session)).toEqual({
      ...session,
      phase: 'repetition',
      remainingSeconds: squats.repetitionSeconds,
      completedRepetitions: 1,
      lastEvent: 'repetition-started',
    });
  });

  it('CA5: completes the exercise and starts the next one after its last repetition', () => {
    const session = sessionWith({
      status: 'running',
      phase: 'rest',
      remainingSeconds: 1,
      completedRepetitions: squats.repetitions - 1,
    });

    expect(tick(session)).toEqual({
      ...session,
      currentIndex: 1,
      phase: 'repetition',
      remainingSeconds: pushUps.repetitionSeconds,
      completedRepetitions: 0,
      lastEvent: 'exercise-completed',
    });
  });

  it('CA6: finishes the workout after the last repetition of the last exercise', () => {
    const session = sessionWith({
      status: 'running',
      currentIndex: 1,
      phase: 'rest',
      remainingSeconds: 1,
      completedRepetitions: pushUps.repetitions - 1,
    });

    expect(tick(session)).toEqual({
      ...session,
      status: 'finished',
      remainingSeconds: 0,
      completedRepetitions: pushUps.repetitions,
      lastEvent: 'workout-completed',
    });
  });

  for (const status of ['idle', 'paused', 'finished'] as const) {
    it(`has no effect on a ${status} session`, () => {
      const session = sessionWith({ status });

      expect(tick(session)).toBe(session);
    });
  }
});

describe('a complete workout', () => {
  it('CA6 and CA12: runs every exercise in order until the workout finishes', () => {
    const shortSquats: Exercise = { name: 'Squats', repetitions: 2, repetitionSeconds: 3, restSeconds: 2 };
    const shortPushUps: Exercise = { name: 'Push-ups', repetitions: 1, repetitionSeconds: 2, restSeconds: 1 };
    // [remainingSeconds, phase, completedRepetitions, currentIndex, status, lastEvent] after each tick.
    const expected = [
      [2, 'repetition', 0, 0, 'running', null],
      [1, 'repetition', 0, 0, 'running', null],
      [2, 'rest', 0, 0, 'running', 'rest-started'],
      [1, 'rest', 0, 0, 'running', 'rest-started'],
      [3, 'repetition', 1, 0, 'running', 'repetition-started'],
      [2, 'repetition', 1, 0, 'running', 'repetition-started'],
      [1, 'repetition', 1, 0, 'running', 'repetition-started'],
      [2, 'rest', 1, 0, 'running', 'rest-started'],
      [1, 'rest', 1, 0, 'running', 'rest-started'],
      [2, 'repetition', 0, 1, 'running', 'exercise-completed'],
      [1, 'repetition', 0, 1, 'running', 'exercise-completed'],
      [1, 'rest', 0, 1, 'running', 'rest-started'],
      [0, 'rest', 1, 1, 'finished', 'workout-completed'],
    ] as const;

    let session = start(createSession([shortSquats, shortPushUps]));
    const actual = expected.map(() => {
      session = tick(session);
      return [
        session.remainingSeconds,
        session.phase,
        session.completedRepetitions,
        session.currentIndex,
        session.status,
        session.lastEvent,
      ];
    });

    expect(actual).toEqual(expected.map((row) => [...row]));
    expect(tick(session)).toBe(session);
  });
});
