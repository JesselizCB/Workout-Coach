import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkoutToastComponent } from './workout-toast.component';

describe('WorkoutToastComponent', () => {
  let fixture: ComponentFixture<WorkoutToastComponent>;

  async function render(message: string | null): Promise<HTMLElement> {
    fixture = TestBed.createComponent(WorkoutToastComponent);
    fixture.componentRef.setInput('message', message);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the message it receives', async () => {
    const element = await render('Tiempo de descanso');

    expect(element.querySelector('.toast')?.textContent?.trim()).toBe('Tiempo de descanso');
  });

  it('shows nothing when there is no message', async () => {
    const element = await render(null);

    expect(element.querySelector('.toast')).toBeNull();
  });

  it('CA12: replaces the message when a new one arrives', async () => {
    const element = await render('Tiempo de descanso');

    fixture.componentRef.setInput('message', 'De vuelta al ejercicio');
    await fixture.whenStable();

    expect(element.querySelector('.toast')?.textContent?.trim()).toBe('De vuelta al ejercicio');
  });

  it('keeps a status live region even while empty, so screen readers announce new messages', async () => {
    const element = await render(null);

    expect(element.getAttribute('role')).toBe('status');

    fixture.componentRef.setInput('message', 'Tiempo de descanso');
    await fixture.whenStable();

    expect(element.getAttribute('role')).toBe('status');
  });
});
