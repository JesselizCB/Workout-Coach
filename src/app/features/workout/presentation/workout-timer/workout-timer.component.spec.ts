import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Phase, SessionStatus } from '../../domain/workout-session';
import { WorkoutTimerComponent } from './workout-timer.component';

interface TimerInputs {
  exerciseName: string;
  phase: Phase;
  phaseLabel: string;
  remainingSeconds: number;
  repetitionSeconds: number;
  restSeconds: number;
  completedRepetitions: number;
  totalRepetitions: number;
  status: SessionStatus;
}

const defaults: TimerInputs = {
  exerciseName: 'Squats',
  phase: 'repetition',
  phaseLabel: 'Ejercicio',
  remainingSeconds: 5,
  repetitionSeconds: 5,
  restSeconds: 3,
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
    expect(text('.progress__label')).toBe('Repeticiones completadas');
    expect(text('.progress__count')).toBe('1 / 2');
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

  describe('repetition progress bar', () => {
    function progressBar(): HTMLElement | null {
      return element.querySelector('[role="progressbar"]');
    }

    function segments(): HTMLElement[] {
      return Array.from(element.querySelectorAll<HTMLElement>('.progress__segment'));
    }

    function segmentFills(): string[] {
      return segments().map((segment) => segment.querySelector<HTMLElement>('.progress__fill')?.style.width ?? '');
    }

    // Squats in these tests: 5 s of exercise + 3 s of rest = an 8 s cycle per repetition.

    it('CA21: shows one segment per repetition', async () => {
      await render({ totalRepetitions: 3 });

      expect(segments().length).toBe(3);
    });

    it('CA21: is empty before the first repetition starts', async () => {
      await render({ completedRepetitions: 0, totalRepetitions: 3, phase: 'repetition', remainingSeconds: 5 });

      expect(segmentFills()).toEqual(['0%', '0%', '0%']);
    });

    it('CA21: fills the current segment every second', async () => {
      await render({ completedRepetitions: 0, totalRepetitions: 3, phase: 'repetition', remainingSeconds: 4 });
      expect(segmentFills()).toEqual(['13%', '0%', '0%']);

      fixture.componentRef.setInput('remainingSeconds', 3);
      await fixture.whenStable();

      expect(segmentFills()).toEqual(['25%', '0%', '0%']);
    });

    it('CA21: keeps completed segments full and fills the current one', async () => {
      await render({ completedRepetitions: 1, totalRepetitions: 3, phase: 'rest', remainingSeconds: 1 });

      expect(segmentFills()).toEqual(['100%', '88%', '0%']);
      expect(segments()[0].classList).toContain('progress__segment--done');
      expect(segments()[1].classList).not.toContain('progress__segment--done');
    });

    it('CA21: completes a segment exactly when its repetition closes', async () => {
      await render({ completedRepetitions: 0, totalRepetitions: 3, phase: 'rest', remainingSeconds: 1 });
      expect(segmentFills()).toEqual(['88%', '0%', '0%']);

      fixture.componentRef.setInput('completedRepetitions', 1);
      fixture.componentRef.setInput('phase', 'repetition');
      fixture.componentRef.setInput('remainingSeconds', 5);
      await fixture.whenStable();

      expect(segmentFills()).toEqual(['100%', '0%', '0%']);
      expect(text('.progress__count')).toBe('1 / 3');
    });

    it('CA21: fills every segment when the workout is finished', async () => {
      await render({ completedRepetitions: 3, totalRepetitions: 3, phase: 'rest', remainingSeconds: 0, status: 'finished' });

      expect(segmentFills()).toEqual(['100%', '100%', '100%']);
    });

    it('CA21: tells screen readers how many repetitions are done', async () => {
      await render({ completedRepetitions: 1, totalRepetitions: 3 });

      expect(progressBar()?.getAttribute('aria-valuenow')).toBe('1');
      expect(progressBar()?.getAttribute('aria-valuemin')).toBe('0');
      expect(progressBar()?.getAttribute('aria-valuemax')).toBe('3');
      expect(progressBar()?.getAttribute('aria-valuetext')).toBe('1 de 3');
      expect(progressBar()?.getAttribute('aria-label')).toBe('Progreso de repeticiones');
    });
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

    it('gives the main action more visual weight than reset', async () => {
      await render({ status: 'idle' });
      expect(button('Iniciar')?.classList).toContain('button--primary');
      expect(button('Reiniciar')?.classList).toContain('button--secondary');

      fixture.componentRef.setInput('status', 'running');
      await fixture.whenStable();

      expect(button('Pausar')?.classList).toContain('button--primary');
      expect(button('Reiniciar')?.classList).toContain('button--secondary');
    });

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
