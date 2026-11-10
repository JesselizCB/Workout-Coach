import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Exercise } from '../../domain/exercise';
import { Ticker } from '../../domain/ports/ticker';
import { WorkoutRepository } from '../../domain/ports/workout.repository';
import { FakeTicker } from '../../testing/fake-ticker';
import { WorkoutPageComponent } from './workout-page.component';

const squats: Exercise = { name: 'Squats', repetitions: 3, repetitionSeconds: 5, restSeconds: 3 };
const pushUps: Exercise = { name: 'Push-ups', repetitions: 2, repetitionSeconds: 4, restSeconds: 2 };

describe('WorkoutPageComponent', () => {
  let ticker: FakeTicker;
  let fixture: ComponentFixture<WorkoutPageComponent>;
  let element: HTMLElement;

  async function render(getExercises: () => Promise<readonly Exercise[]>): Promise<void> {
    ticker = new FakeTicker();
    const repository: WorkoutRepository = { getExercises };
    TestBed.configureTestingModule({
      providers: [
        { provide: WorkoutRepository, useValue: repository },
        { provide: Ticker, useValue: ticker },
      ],
    });
    fixture = TestBed.createComponent(WorkoutPageComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  const renderWorkout = (exercises: readonly Exercise[] = [squats, pushUps]) =>
    render(() => Promise.resolve(exercises));

  function textOf(selector: string): string | undefined {
    return element.querySelector(selector)?.textContent?.trim();
  }

  function textsOf(selector: string): (string | undefined)[] {
    return Array.from(element.querySelectorAll(selector)).map((node) => node.textContent?.trim());
  }

  function button(label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find((b) => b.textContent?.trim() === label);
  }

  async function click(label: string): Promise<void> {
    button(label)?.click();
    await fixture.whenStable();
  }

  async function advance(seconds: number): Promise<void> {
    ticker.tick(seconds);
    await fixture.whenStable();
  }

  it('CA1: shows every exercise as pending and does not start on its own', async () => {
    await renderWorkout();

    expect(textOf('.timer__exercise')).toBe('Squats');
    expect(textOf('.timer')).toBe('00:05');
    expect(textsOf('.exercise-item__status')).toEqual(['Pendiente', 'Pendiente']);
    expect(ticker.running).toBeFalse();
  });

  it('CA2: starting marks the first exercise in progress and runs its repetition time', async () => {
    await renderWorkout();

    await click('Iniciar');
    await advance(1);

    expect(textsOf('.exercise-item__status')).toEqual(['En curso', 'Pendiente']);
    expect(textOf('.timer')).toBe('00:04');
    expect(button('Pausar')).toBeDefined();
  });

  it('CA3 and CA12: shows the rest phase and its notification', async () => {
    await renderWorkout();
    await click('Iniciar');

    await advance(squats.repetitionSeconds);

    expect(textOf('.phase')).toBe('Descanso');
    expect(textOf('.timer')).toBe('00:03');
    expect(textOf('.toast')).toBe('Tiempo de descanso');
  });

  it('CA6: finishes the whole workout', async () => {
    const quick: Exercise = { name: 'Quick', repetitions: 1, repetitionSeconds: 1, restSeconds: 1 };
    await renderWorkout([quick, quick]);
    await click('Iniciar');

    await advance(4);

    expect(textsOf('.exercise-item__status')).toEqual(['Completado', 'Completado']);
    expect(textOf('.toast')).toBe('Entrenamiento completado');
    expect(textOf('.phase')).toBe('Finalizado');
    expect(textOf('.timer')).toBe('00:00');
    expect(button('Iniciar')?.disabled).toBeTrue();
  });

  it('CA21: fills the progress bar with each repetition and restarts it for the next exercise', async () => {
    const twoReps: Exercise = { name: 'Two reps', repetitions: 2, repetitionSeconds: 1, restSeconds: 1 };
    const oneRep: Exercise = { name: 'One rep', repetitions: 1, repetitionSeconds: 1, restSeconds: 1 };
    await renderWorkout([twoReps, oneRep]);
    const progress = () => element.querySelector('[role="progressbar"]');
    await click('Iniciar');

    await advance(2);
    expect(progress()?.getAttribute('aria-valuetext')).toBe('1 de 2');

    await advance(2);
    expect(textOf('.timer__exercise')).toBe('One rep');
    expect(progress()?.getAttribute('aria-valuetext')).toBe('0 de 1');
  });

  it('CA8: resetting returns to the initial screen', async () => {
    await renderWorkout();
    await click('Iniciar');
    await advance(6);

    await click('Reiniciar');

    expect(textsOf('.exercise-item__status')).toEqual(['Pendiente', 'Pendiente']);
    expect(textOf('.timer')).toBe('00:05');
    expect(element.querySelector('.toast')).toBeNull();
  });

  it('CA16: shows an error message instead of the workout when loading fails', async () => {
    await render(() => Promise.reject(new Error('Network down')));

    expect(textOf('[role="alert"]')).toBe('No se pudo cargar el entrenamiento. Inténtalo de nuevo más tarde.');
    expect(element.querySelector('.timer')).toBeNull();
  });
});
