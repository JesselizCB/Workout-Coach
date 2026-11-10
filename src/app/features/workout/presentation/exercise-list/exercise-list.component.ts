import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ExerciseStatus } from '../../domain/workout-session';
import { ExerciseItemComponent } from '../exercise-item/exercise-item.component';

/** What the list needs to show for each exercise, already prepared by the container. */
export interface ExerciseListItem {
  readonly name: string;
  readonly repetitions: number;
  readonly status: ExerciseStatus;
  readonly statusLabel: string;
}

@Component({
  selector: 'app-exercise-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ExerciseItemComponent],
  template: `
    <ul class="exercise-list">
      @for (item of items(); track $index) {
        <li
          app-exercise-item
          [name]="item.name"
          [repetitions]="item.repetitions"
          [status]="item.status"
          [statusLabel]="item.statusLabel"
        ></li>
      }
    </ul>
  `,
  styles: `
    .exercise-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 1.5rem 0 0;
      padding: 0;
      list-style: none;
    }
  `,
})
export class ExerciseListComponent {
  readonly items = input.required<readonly ExerciseListItem[]>();
}
