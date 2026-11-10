import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExerciseStatus } from '../../domain/workout-session';
import { ExerciseItemComponent } from './exercise-item.component';

describe('ExerciseItemComponent', () => {
  let fixture: ComponentFixture<ExerciseItemComponent>;

  async function render(
    inputs: { name?: string; repetitions?: number; status?: ExerciseStatus; statusLabel?: string } = {},
  ): Promise<HTMLElement> {
    fixture = TestBed.createComponent(ExerciseItemComponent);
    fixture.componentRef.setInput('name', inputs.name ?? 'Squats');
    fixture.componentRef.setInput('repetitions', inputs.repetitions ?? 3);
    fixture.componentRef.setInput('status', inputs.status ?? 'pending');
    fixture.componentRef.setInput('statusLabel', inputs.statusLabel ?? 'Pendiente');
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the exercise name, its repetitions and its status label', async () => {
    const element = await render({ name: 'Squats', repetitions: 3, statusLabel: 'Pendiente' });

    expect(element.textContent).toContain('Squats');
    expect(element.textContent).toContain('3 repeticiones');
    expect(element.textContent).toContain('Pendiente');
  });

  it('uses the singular for a single repetition', async () => {
    const element = await render({ repetitions: 1 });

    expect(element.textContent).toContain('1 repetición');
    expect(element.textContent).not.toContain('repeticiones');
  });

  for (const status of ['pending', 'in-progress', 'completed'] as const) {
    it(`CA5: marks the item with the ${status} status class`, async () => {
      const element = await render({ status });

      expect(element.classList).toContain(`exercise-item--${status}`);
    });
  }

  it('updates when its inputs change', async () => {
    const element = await render({ status: 'pending', statusLabel: 'Pendiente' });

    fixture.componentRef.setInput('status', 'in-progress');
    fixture.componentRef.setInput('statusLabel', 'En curso');
    await fixture.whenStable();

    expect(element.textContent).toContain('En curso');
    expect(element.classList).toContain('exercise-item--in-progress');
    expect(element.classList).not.toContain('exercise-item--pending');
  });
});
