import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The host is always present as a status live region; only its content changes.
 * Screen readers announce changes only in regions that already existed on the page.
 */
@Component({
  selector: 'app-workout-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  template: `
    @if (message(); as text) {
      <p class="toast">{{ text }}</p>
    }
  `,
})
export class WorkoutToastComponent {
  readonly message = input.required<string | null>();
}
