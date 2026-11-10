import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExerciseListComponent, ExerciseListItem } from './exercise-list.component';

const items: readonly ExerciseListItem[] = [
  { name: 'Squats', repetitions: 3, status: 'completed', statusLabel: 'Completado' },
  { name: 'Push-ups', repetitions: 2, status: 'in-progress', statusLabel: 'En curso' },
  { name: 'Plank', repetitions: 2, status: 'pending', statusLabel: 'Pendiente' },
];

describe('ExerciseListComponent', () => {
  let fixture: ComponentFixture<ExerciseListComponent>;

  async function render(list: readonly ExerciseListItem[]): Promise<HTMLElement> {
    fixture = TestBed.createComponent(ExerciseListComponent);
    fixture.componentRef.setInput('items', list);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function renderedItems(element: HTMLElement): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>('ul > li.exercise-item'));
  }

  it('shows one list item per exercise, in order', async () => {
    const element = await render(items);

    const names = renderedItems(element).map((item) => item.querySelector('.exercise-item__name')?.textContent);

    expect(names).toEqual(['Squats', 'Push-ups', 'Plank']);
  });

  it('CA5: shows the status of every exercise', async () => {
    const element = await render(items);

    const statuses = renderedItems(element).map((item) => item.querySelector('.exercise-item__status')?.textContent);

    expect(statuses).toEqual(['Completado', 'En curso', 'Pendiente']);
  });

  it('updates the statuses when the list changes', async () => {
    const element = await render(items.map((item) => ({ ...item, status: 'pending', statusLabel: 'Pendiente' })));

    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();

    expect(renderedItems(element)[0].classList).toContain('exercise-item--completed');
  });
});
