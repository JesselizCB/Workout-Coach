import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Phase, SessionStatus } from '../../domain/workout-session';
import { WorkoutTimerComponent } from './workout-timer.component';

interface TimerInputs {
  exerciseName: string;
  phase: Phase;
  phaseLabel: string;
  remainingSeconds: number;
  completedRepetitions: number;
  totalRepetitions: number;
  status: SessionStatus;
}

const defaults: TimerInputs = {
  exerciseName: 'Squats',
  phase: 'repetition',
  phaseLabel: 'Ejercicio',
  remainingSeconds: 5,
  completedRepetitions: 0,
  totalRepetitions: 3,
  status: 'idle',
};

describe('WorkoutTimerComponent', () => {
  let fixture: ComponentFixture<WorkoutTimerComponent>;
  let element: HTMLElement;

  async function render(inputs: Partial<TimerInputs> = {}): Promise<void> {
    fixture = TestBed.createComponent(WorkoutTimerComponent);
    for (const [name, value] of Object.entries({ ...defaults, ...inputs })) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.autoDetectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  function button(label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find((b) => b.textContent?.trim() === label);
  }

  function text(selector: string): string | undefined {
    return element.querySelector(selector)?.textContent?.trim();
  }

  it('shows the exercise, the phase and the completed repetitions', async () => {
    await render({ exerciseName: 'Push-ups', phaseLabel: 'Ejercicio', completedRepetitions: 1, totalRepetitions: 2 });

    expect(text('.timer__exercise')).toBe('Push-ups');
    expect(text('.phase')).toBe('Ejercicio');
    expect(text('.timer__repetitions')).toBe('Repeticiones completadas: 1 / 2');
  });

  it('CA10: shows the remaining time as mm:ss', async () => {
    await render({ remainingSeconds: 90 });

    expect(text('.timer')).toBe('01:30');
  });

  it('CA11: marks the rest phase so it looks different', async () => {
    await render({ phase: 'repetition' });
    expect(element.querySelector('.phase')?.classList).not.toContain('phase--rest');

    fixture.componentRef.setInput('phase', 'rest');
    await fixture.whenStable();

    expect(element.querySelector('.phase')?.classList).toContain('phase--rest');
  });

  it('does not use the rest style once the workout is finished', async () => {
    await render({ phase: 'rest', status: 'finished', remainingSeconds: 0 });

    expect(element.querySelector('.phase')?.classList).not.toContain('phase--rest');
    expect(element.querySelector('.timer')?.classList).not.toContain('timer--rest');
  });

  describe('controls', () => {
    const table: readonly [SessionStatus, 'enabled' | 'disabled' | 'hidden', boolean][] = [
      ['idle', 'enabled', false],
      ['running', 'hidden', true],
      ['paused', 'enabled', false],
      ['finished', 'disabled', false],
    ];

    for (const [status, start, pauseVisible] of table) {
      it(`shows the right controls for a ${status} session`, async () => {
        await render({ status });

        const startButton = button('Iniciar');
        expect(startButton === undefined ? 'hidden' : startButton.disabled ? 'disabled' : 'enabled').toBe(start);
        expect(button('Pausar') !== undefined).toBe(pauseVisible);
        expect(button('Reiniciar')?.disabled).toBeFalse();
      });
    }

    it('emits start, pause and reset when their buttons are clicked', async () => {
      const events: string[] = [];
      await render({ status: 'idle' });
      fixture.componentInstance.start.subscribe(() => events.push('start'));
      fixture.componentInstance.pause.subscribe(() => events.push('pause'));
      fixture.componentInstance.reset.subscribe(() => events.push('reset'));

      button('Iniciar')?.click();
      fixture.componentRef.setInput('status', 'running');
      await fixture.whenStable();
      button('Pausar')?.click();
      button('Reiniciar')?.click();

      expect(events).toEqual(['start', 'pause', 'reset']);
    });

    it('CA9: does not emit start once the workout is finished', async () => {
      const start = jasmine.createSpy('start');
      await render({ status: 'finished' });
      fixture.componentInstance.start.subscribe(start);

      button('Iniciar')?.click();

      expect(start).not.toHaveBeenCalled();
    });
  });
});
