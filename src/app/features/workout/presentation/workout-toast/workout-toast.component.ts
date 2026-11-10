import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// The live region must exist before a message arrives, or screen readers will not announce it.
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
