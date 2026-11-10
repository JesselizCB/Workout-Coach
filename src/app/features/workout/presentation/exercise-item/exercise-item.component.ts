import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ExerciseStatus } from '../../domain/workout-session';
import { WORKOUT_TEXTS } from '../workout.labels';

@Component({
  selector: 'li[app-exercise-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'exercise-item',
    '[class.exercise-item--pending]': "status() === 'pending'",
    '[class.exercise-item--in-progress]': "status() === 'in-progress'",
    '[class.exercise-item--completed]': "status() === 'completed'",
  },
  template: `
    <span class="exercise-item__name">{{ name() }}</span>
    <span class="exercise-item__repetitions">{{ repetitionsText() }}</span>
    <span class="exercise-item__status">{{ statusLabel() }}</span>
  `,
  styles: `
    :host {
      display: flex;
      gap: 0.75rem;
      align-items: baseline;
      padding: 0.5rem 0.75rem;
      border-left: 4px solid #aeb6bf;
      border-radius: 4px;
    }
    .exercise-item__name { flex: 1; font-weight: 600; }
    .exercise-item__status { font-size: 0.9rem; }
    :host(.exercise-item--pending) { color: #5d6d7e; }
    :host(.exercise-item--in-progress) { border-left-color: #1f6feb; background: #e8f4ff; }
    :host(.exercise-item--completed) { border-left-color: #1e8449; color: #1e8449; }
  `,
})
export class ExerciseItemComponent {
  readonly name = input.required<string>();
  readonly repetitions = input.required<number>();
  readonly status = input.required<ExerciseStatus>();
  readonly statusLabel = input.required<string>();

  protected readonly repetitionsText = computed(() => {
    const count = this.repetitions();
    return `${count} ${count === 1 ? WORKOUT_TEXTS.repetition : WORKOUT_TEXTS.repetitions}`;
  });
}
